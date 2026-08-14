import type { Env } from "../types";
import { askFormPage, askResultsPage } from "../templates/ask";
import { errorPage } from "../templates/subscribe";

const SYSTEM_PROMPT =
  "You are the answer assistant for NursingHomeGrade, a site that publishes independent A-F nursing home " +
  "quality grades from public CMS data. Answer only using the provided context. If the context doesn't " +
  "cover the question, say you don't have that information rather than guessing. Never claim to have " +
  "researched a specific real facility beyond what's in the context. Keep answers concise and factual.";

export async function handleAsk(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const question = (url.searchParams.get("q") ?? "").trim().slice(0, 500);

  if (!question) {
    return new Response(askFormPage(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  }

  try {
    // Reranking is forced off: the instance's reranker model has been
    // silently returning zero results (it's hitting the same "workers ai
    // out of capacity" error visible on ~180 items in the AI Search
    // dashboard's indexed-items list), which made every /ask query answer
    // "I don't have that information" despite retrieval finding real
    // matches. match_threshold compensates as the sole relevance filter
    // until Cloudflare's capacity issue clears — re-enable reranking then.
    const result = await env.AI_SEARCH.chatCompletions({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      ai_search_options: {
        retrieval: { match_threshold: 0.3, max_num_results: 8 },
        reranking: { enabled: false },
      },
    });

    const answer = result.choices[0]?.message.content ?? "";
    const html = askResultsPage(question, answer, result.chunks ?? []);
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  } catch (err) {
    console.error("handleAsk error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
