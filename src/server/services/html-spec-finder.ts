const HREF_RE = /<(?:a|link)[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;
const SCRIPT_RE = /<script[^>]+type=["']application\/(json|yaml)["'][^>]*>([\s\S]*?)<\/script>/gi;

const COMMON_PATHS = [
  '/openapi.json',
  '/openapi.yaml',
  '/openapi.yml',
  '/swagger.json',
  '/swagger.yaml',
  '/api/openapi.json',
  '/api/openapi.yaml',
  '/api-docs',
  '/v2/api-docs',
  '/v3/api-docs',
];

function isSpecLike(href: string): boolean {
  const h = href.toLowerCase();
  const ext = h.endsWith('.json') || h.endsWith('.yaml') || h.endsWith('.yml');
  const kw =
    h.includes('openapi') ||
    h.includes('swagger') ||
    h.includes('spec') ||
    h.includes('api-docs');
  return ext && kw;
}

export function extractSpecUrls(html: string, pageUrl: string): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  HREF_RE.lastIndex = 0;
  while ((match = HREF_RE.exec(html)) !== null) {
    const href = match[1];
    if (!isSpecLike(href)) continue;
    try {
      results.push(new URL(href, pageUrl).href);
    } catch {
      // skip malformed href
    }
  }
  return results;
}

export function commonSpecPaths(pageUrl: string): string[] {
  const origin = new URL(pageUrl).origin;
  return COMMON_PATHS.map((p) => `${origin}${p}`);
}

export function extractInlineSpec(html: string): string | null {
  let match: RegExpExecArray | null;
  SCRIPT_RE.lastIndex = 0;
  while ((match = SCRIPT_RE.exec(html)) !== null) {
    const content = match[2].trim();
    if (content.includes('"openapi"') || content.includes('"swagger"') ||
        content.includes("openapi:") || content.includes("swagger:")) {
      return content;
    }
  }
  return null;
}
