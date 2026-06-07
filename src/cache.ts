const HTML_CACHE_VERSION = "html:v15";

export function htmlCacheKey(key: string): string {
  return `${HTML_CACHE_VERSION}:${key}`;
}
