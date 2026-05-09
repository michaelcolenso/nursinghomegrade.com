import type { Env } from "../types";
import { aboutPage } from "../templates/about";

export async function handleAbout(_request: Request, _env: Env): Promise<Response> {
  const html = aboutPage();
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
