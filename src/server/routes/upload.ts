import { type RequestHandler, Router } from 'express';
import multer, { type Multer } from 'multer';
import { parseSpecIsolated, ParseBusyError } from '../services/parse-isolated';
import { fetchSpecFromUrl, UrlFetchError, type UrlErrorCode } from '../services/url-fetcher';
import { MAX_SPEC_BYTES, ParseError, type ParseErrorCode } from '@shared/types';


const ALLOWED_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);

function extension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

const STATUS_BY_CODE: Record<ParseErrorCode | 'NO_FILE', number> = {
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_FORMAT: 415,
  INVALID_SPEC: 400,
  EMPTY_SPEC: 400,
  UNSUPPORTED_VERSION: 400,
  UNSUPPORTED_AUTH: 400,
  SWAGGER2_CONVERSION_FAILED: 400,
  POSTMAN_CONVERSION_FAILED: 400,
  PARSE_TIMEOUT: 504,
  PARSE_DEPTH_EXCEEDED: 400,
  PARSE_TOO_COMPLEX: 422, // syntactically fine but we refuse to process it (anti-DoS, D004)
  NO_FILE: 400,
};

function buildUploader(): Multer {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SPEC_BYTES, files: 1 },
  });
}

const handler: RequestHandler = async (req, res) => {
  // SPEC R1.6.9 — only "file" matters; any other multipart field is ignored.
  const file = req.file;
  if (!file) {
    res.status(STATUS_BY_CODE.NO_FILE).json({
      code: 'NO_FILE',
      message: 'No file provided. Attach your API description under the "file" field.',
    });
    return;
  }

  const ext = extension(file.originalname);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    res.status(STATUS_BY_CODE.UNSUPPORTED_FORMAT).json({
      code: 'UNSUPPORTED_FORMAT',
      message: 'Unsupported file format. Use JSON or YAML.',
    });
    return;
  }

  try {
    const raw = file.buffer.toString('utf-8');
    const parsed = await parseSpecIsolated(raw, { sizeBytes: file.size });
    res.status(200).json(parsed);
  } catch (err) {
    if (err instanceof ParseBusyError) {
      res.status(429).json({ code: 'PARSE_BUSY', message: err.message });
      return;
    }
    if (err instanceof ParseError) {
      res.status(STATUS_BY_CODE[err.code]).json({ code: err.code, message: err.message });
      return;
    }
    // Unknown error — surface as INVALID_SPEC, never leak the stack.
    res.status(400).json({
      code: 'INVALID_SPEC',
      message: 'Could not process the uploaded file.',
    });
  }
};

export function createUploadRouter(): Router {
  const uploader = buildUploader();
  const router = Router();
  router.post(
    '/',
    (req, res, next) => {
      uploader.single('file')(req, res, (err: unknown) => {
        if (!err) return next();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const code: string | undefined = (err as any)?.code;
        if (code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            code: 'PAYLOAD_TOO_LARGE',
            message: 'File exceeds the 10 MB limit.',
          });
          return;
        }
        // Wrong field name or extra files — surface the same NO_FILE hint
        // the handler would have produced, so the user actually knows what
        // multipart field to attach the spec to.
        if (code === 'LIMIT_UNEXPECTED_FILE' || code === 'LIMIT_FILE_COUNT') {
          res.status(400).json({
            code: 'NO_FILE',
            message: 'No file provided. Attach your API description under the "file" field.',
          });
          return;
        }
        res.status(400).json({
          code: 'INVALID_SPEC',
          message: 'Could not read the upload.',
        });
      });
    },
    handler
  );
  return router;
}

const URL_STATUS: Record<UrlErrorCode, number> = {
  URL_INVALID: 400,
  URL_PRIVATE_IP_BLOCKED: 400,
  URL_FETCH_FAILED: 400,
  URL_TIMEOUT: 504,
  URL_TOO_LARGE: 413,
};

const urlHandler: RequestHandler = async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) {
    res.status(400).json({ code: 'URL_INVALID', message: 'A url field is required.' });
    return;
  }
  try {
    const raw = await fetchSpecFromUrl(url);
    const parsed = await parseSpecIsolated(raw, { sizeBytes: Buffer.byteLength(raw) });
    res.status(200).json(parsed);
  } catch (err) {
    if (err instanceof UrlFetchError) {
      res.status(URL_STATUS[err.code]).json({ code: err.code, message: err.message });
      return;
    }
    if (err instanceof ParseBusyError) {
      res.status(429).json({ code: 'PARSE_BUSY', message: err.message });
      return;
    }
    if (err instanceof ParseError) {
      res.status(STATUS_BY_CODE[err.code] ?? 400).json({ code: err.code, message: err.message });
      return;
    }
    res.status(400).json({ code: 'INVALID_SPEC', message: 'Could not process the spec at this URL.' });
  }
};

export function createUploadUrlRouter(): Router {
  const router = Router();
  router.post('/', urlHandler);
  return router;
}
