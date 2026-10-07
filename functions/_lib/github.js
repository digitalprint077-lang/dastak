function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "dastak-publish",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function githubPublishConfigured(env) {
  return Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO);
}

export async function githubGetJsonFile(env, filePath) {
  const branch = env.GITHUB_BRANCH || "main";
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: githubHeaders(env) });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub read ${filePath}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return null;
  const text = atob(String(data.content ?? "").replace(/\n/g, ""));
  return { sha: data.sha, json: JSON.parse(text) };
}

export async function githubPutJsonFile(env, filePath, obj, message, sha) {
  const branch = env.GITHUB_BRANCH || "main";
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const content = utf8ToBase64(`${JSON.stringify(obj, null, 2)}\n`);
  const body = { message, content, branch };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GitHub write ${filePath}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
