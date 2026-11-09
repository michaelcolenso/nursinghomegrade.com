/** Match the top-level error fields without importing the Worker router. */
export function logPageRenderError(route: string, err: unknown, providerId: string | null = null): void {
  console.error(JSON.stringify({
    level: "error",
    msg: "page_render_error",
    route,
    provider_id: providerId,
    error: err instanceof Error ? err.name : typeof err,
    message: err instanceof Error ? err.message : String(err),
  }));
}
