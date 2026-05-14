import type { Env } from "../types";
import { comparePage } from "../templates/compare";

export async function handleCompare(request: Request, env: Env): Promise<Response> {
  const html = comparePage();
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
    },
  });
}
