import { githubGetJsonFile, githubPublishConfigured, githubPutJsonFile } from "./github.js";

export async function publishCertificateToGitHub(env, token, payload) {
  if (!githubPublishConfigured(env)) {
    return { ok: false, reason: "no-github" };
  }

  const status = payload?.status || "Issued";
  const values = payload?.values && typeof payload.values === "object" ? payload.values : {};
  const tracking = String(values["Tracking ID"] ?? "").trim() || token;
  const certPath = `public/certs/${tracking}.json`;
  const pubPath = "public/published-certificates.json";

  const certObj = { token, status, values };
  let certMeta = null;
  try {
    certMeta = await githubGetJsonFile(env, certPath);
  } catch {
    /* new file */
  }

  await githubPutJsonFile(
    env,
    certPath,
    certObj,
    `Publish certificate ${tracking}`,
    certMeta?.sha
  );

  const pubMeta = await githubGetJsonFile(env, pubPath);
  const certificates =
    pubMeta?.json?.certificates && typeof pubMeta.json.certificates === "object"
      ? { ...pubMeta.json.certificates }
      : {};
  certificates[token] = { status, values };
  await githubPutJsonFile(
    env,
    pubPath,
    { version: 1, certificates },
    `Update published registry (${tracking})`,
    pubMeta?.sha
  );

  return { ok: true, reason: "github", tracking };
}
