import { onRequestGet as certificatesGet, onRequestPut as certificatesPut } from "../functions/api/certificates.js";
import { onRequestGet as certificateGet, onRequestPut as certificatePut } from "../functions/api/certificate/[slug].js";
import { githubPublishConfigured } from "../functions/_lib/github.js";

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/api/publish-health" && request.method === "GET") {
      const github = githubPublishConfigured(env);
      return new Response(
        JSON.stringify({
          github,
          authConfigured: Boolean(env.ADMIN_SYNC_KEY || env.VITE_ADMIN_PASSWORD),
        }),
        { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      );
    }

    if (pathname === "/api/certificates") {
      const context = { env, request };
      if (request.method === "GET") return certificatesGet(context);
      if (request.method === "PUT") return certificatesPut(context);
      return new Response("Method Not Allowed", { status: 405 });
    }

    const certPrefix = "/api/certificate/";
    if (pathname.startsWith(certPrefix)) {
      const slug = decodeURIComponent(pathname.slice(certPrefix.length).split("/")[0] || "");
      const context = { env, request, params: { slug } };
      if (request.method === "GET") return certificateGet(context);
      if (request.method === "PUT") return certificatePut(context);
      return new Response("Method Not Allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
};
