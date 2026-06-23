import { createHash } from "node:crypto";

function slug(value, fallback = "na") {
  const text = String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return text.slice(0, 12) || fallback;
}

export function buildPromptCacheKey(namespace, payload = {}) {
  const digest = createHash("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 24);
  return `pulsetest:${slug(namespace)}:${digest}`;
}
