import type { Env } from "../types";
import { howWeGradePage } from "../templates/how-we-grade";

export async function handleHowWeGrade(_request: Request, _env: Env): Promise<Response> {
  const html = howWeGradePage();
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
