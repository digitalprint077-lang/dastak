import {
  githubDeleteFile,
  githubGetJsonFile,
  githubPublishConfigured,
  githubPutJsonFile,
} from "./github.js";

function findRegistryEntry(certificates, slugOrToken) {
  const id = decodeURIComponent(String(slugOrToken ?? "").trim());
  if (!id) return null;
  if (certificates[id]) return { token: id, payload: certificates[id] };
  for (const [token, payload] of Object.entries(certificates)) {
    const tracking = String(payload?.values?.["Tracking ID"] ?? "").trim();
    const certNo = String(payload?.values?.["Certificate Number"] ?? "").trim();
    if (tracking === id || certNo === id) {
      return { token, payload };
    }
  }
  return null;
}

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

export async function deleteCertificateFromGitHub(env, slugOrToken) {
  if (!githubPublishConfigured(env)) {
    return { ok: false, reason: "no-github" };
  }

  const pubPath = "public/published-certificates.json";
  const pubMeta = await githubGetJsonFile(env, pubPath);
  const certificates =
    pubMeta?.json?.certificates && typeof pubMeta.json.certificates === "object"
      ? { ...pubMeta.json.certificates }
      : {};

  const entry = findRegistryEntry(certificates, slugOrToken);
  if (!entry) {
    return { ok: false, reason: "not-found" };
  }

  const tracking = String(entry.payload?.values?.["Tracking ID"] ?? "").trim() || entry.token;
  const certPath = `public/certs/${tracking}.json`;
  try {
    const certMeta = await githubGetJsonFile(env, certPath);
    if (certMeta?.sha) {
      await githubDeleteFile(env, certPath, certMeta.sha, `Delete certificate ${tracking}`);
    }
  } catch {
    /* cert file may already be missing */
  }

  delete certificates[entry.token];
  await githubPutJsonFile(
    env,
    pubPath,
    { version: 1, updatedAt: new Date().toISOString(), certificates },
    `Remove certificate ${tracking} from registry`,
    pubMeta?.sha
  );

  return { ok: true, reason: "github", token: entry.token, tracking };
}
