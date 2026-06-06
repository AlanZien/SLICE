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
  // Extension-less well-known patterns (e.g. /api-docs, /swagger, /openapi)
  if (/\/(openapi|swagger)$/.test(h) || /\/(v\d+\/)?api-docs$/.test(h)) return true;
  // Extension-bearing: must have both a spec keyword and a json/yaml extension
  const hasExt = /\.(json|yaml|yml)$/.test(h);
  const hasKeyword = /openapi|swagger|spec|api-docs/.test(h);
  return hasExt && hasKeyword;
}

export function extractSpecUrls(html: string, pageUrl: string): string[] {
  const results: string[] = [];
  const hrefRe = /<(?:a|link)[^>]+href=["']([^"'#?]+)["'][^>]*>/gi;
  for (const match of html.matchAll(hrefRe)) {
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
  const scriptRe = /<script[^>]+type=["']application\/(json|yaml)["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRe)) {
    const content = match[2].trim();
    if (content.includes('"openapi"') || content.includes('"swagger"') ||
        content.includes('openapi:') || content.includes('swagger:')) {
      return content;
    }
  }
  return null;
}
