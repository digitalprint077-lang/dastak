import { bakedAdminSyncKey, bakedGithubToken } from "./runtime-secrets.js";

const DEFAULT_OWNER = "digitalprint077-lang";
const DEFAULT_REPO = "dastak";
const DEFAULT_BRANCH = "main";

export function resolveGithubToken(env) {
  return String(env?.GITHUB_TOKEN ?? bakedGithubToken ?? "").trim();
}

export function resolveAdminSyncKey(env) {
  return String(
    env?.ADMIN_SYNC_KEY ??
      env?.VITE_ADMIN_PASSWORD ??
      env?.PUBLISH_ADMIN_PASSWORD ??
      bakedAdminSyncKey ??
      ""
  ).trim();
}

export function resolveGithubOwner(env) {
  return String(env?.GITHUB_OWNER ?? DEFAULT_OWNER).trim() || DEFAULT_OWNER;
}

export function resolveGithubRepo(env) {
  return String(env?.GITHUB_REPO ?? DEFAULT_REPO).trim() || DEFAULT_REPO;
}

export function resolveGithubBranch(env) {
  return String(env?.GITHUB_BRANCH ?? DEFAULT_BRANCH).trim() || DEFAULT_BRANCH;
}

export function githubPublishConfigured(env) {
  return Boolean(resolveGithubToken(env) && resolveGithubOwner(env) && resolveGithubRepo(env));
}

export function adminPublishConfigured(env) {
  return Boolean(resolveAdminSyncKey(env));
}
