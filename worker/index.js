import { onRequestGet as certificatesGet, onRequestPut as certificatesPut } from "../functions/api/certificates.js";
import {
  onRequestGet as certificateGet,
  onRequestPut as certificatePut,
  onRequestDelete as certificateDelete,
} from "../functions/api/certificate/[slug].js";
import {
  adminPublishConfigured,
  githubPublishConfigured,
} from "../functions/_lib/env-bindings.js";

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/api/publish-health" && request.method === "GET") {
      const github = githubPublishConfigured(env);
      const authConfigured = adminPublishConfigured(env);
      const d1 = Boolean(env?.Dastak_binding ?? env?.DB);
      const ok = d1 || github;
      return new Response(
        JSON.stringify({
          d1,
          github,
          authConfigured,
          hint: ok
            ? d1
              ? "ok-d1"
              : "ok"
            : "Set D1 binding or GITHUB_TOKEN; build command npm run deploy",
        }),
        { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      );
    }

    if (pathname === "/api/certificates") {
      const context = { env, request };
      if (request.method === "GET") return certificatesGet(context);
      if (request.method === "PUT") return certificatesPut(context);
      if (request.method === "POST") {
        const { onRequestPost: certificatesPost } = await import("../functions/api/certificates.js");
        return certificatesPost(context);
      }
      return new Response("Method Not Allowed", { status: 405 });
    }

    const certPrefix = "/api/certificate/";
    if (pathname.startsWith(certPrefix)) {
      const slug = decodeURIComponent(pathname.slice(certPrefix.length).split("/")[0] || "");
      const context = { env, request, params: { slug } };
      if (request.method === "GET") return certificateGet(context);
      if (request.method === "PUT") return certificatePut(context);
      if (request.method === "DELETE") return certificateDelete(context);
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (pathname === "/api/permits") {
      const { onRequestGet: permitsGet, onRequestPut: permitsPut } = await import("../functions/api/permits.js");
      const context = { env, request };
      if (request.method === "GET") return permitsGet(context);
      if (request.method === "PUT") return permitsPut(context);
      return new Response("Method Not Allowed", { status: 405 });
    }

    const permitPrefix = "/api/permit/";
    if (pathname.startsWith(permitPrefix)) {
      const slug = decodeURIComponent(pathname.slice(permitPrefix.length).split("/")[0] || "");
      const { onRequestGet: permitGet, onRequestPut: permitPut, onRequestDelete: permitDelete } = await import(
        "../functions/api/permit/[slug].js"
      );
      const context = { env, request, params: { slug } };
      if (request.method === "GET") return permitGet(context);
      if (request.method === "PUT") return permitPut(context);
      if (request.method === "DELETE") return permitDelete(context);
      return new Response("Method Not Allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
};
