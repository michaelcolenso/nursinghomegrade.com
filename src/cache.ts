const HTML_CACHE_VERSION = "html:v8";

export function htmlCacheKey(key: string): string {
  return `${HTML_CACHE_VERSION}:${key}`;
}
