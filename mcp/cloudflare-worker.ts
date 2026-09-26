import { handlePublicMcpRequest } from "./public/server.ts";

type WorkerEnv = {
  OPENAI_APPS_CHALLENGE?: string;
};

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/healthz" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "lum-public-mcp",
          endpoint: "/mcp",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (
      url.pathname === "/.well-known/openai-apps-challenge" &&
      request.method === "GET"
    ) {
      const challenge = String(env.OPENAI_APPS_CHALLENGE || "").trim();
      return challenge
        ? textResponse(challenge)
        : textResponse("OpenAI Apps challenge is not configured.", 404);
    }

    if (url.pathname === "/mcp") {
      return handlePublicMcpRequest(request);
    }

    return textResponse("Not found.", 404);
  },
};
