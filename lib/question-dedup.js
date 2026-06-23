const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "her", "his", "in", "is", "it",
  "its", "of", "on", "or", "she", "that", "the", "their", "there", "they", "this", "to", "was", "were", "with"
]);

function hashString(value = "") {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `pt_${(hash >>> 0).toString(36)}`;
}

export function normalizeQuestionText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b\d+(?:\.\d+)?\b/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function coreTokens(value = "") {
  const tokens = normalizeQuestionText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  return [...new Set(tokens)];
}

function optionCorpus(options = []) {
  return options
    .map((option) => normalizeQuestionText(option?.text || ""))
    .filter(Boolean)
    .sort()
    .join(" | ");
}

export function questionIdentity(question = {}) {
  const subject = normalizeQuestionText(question.subject || "");
  const tags = (question.sourceTags || [])
    .map((tag) => normalizeQuestionText(tag))
    .filter(Boolean)
    .slice(0, 6)
    .sort()
    .join(" | ");
  const stem = normalizeQuestionText(question.stem || "");
  const stemSignature = coreTokens(question.stem || "").slice(0, 18).join(" ");
  const choices = optionCorpus(question.options);
  const preview = (question.stem || "").replace(/\s+/g, " ").trim().split(" ").slice(0, 18).join(" ");
  const signature = [question.subject || "Unknown", (question.sourceTags || []).slice(0, 3).join("/"), preview].filter(Boolean).join(" · ");

  return {
    fingerprint: hashString([subject, stem, choices].join(" || ")),
    nearFingerprint: hashString([subject, tags, stemSignature, choices].join(" || ")),
    signature,
    preview
  };
}

export function rememberQuestionIdentity(question = {}) {
  const identity = questionIdentity(question);
  return {
    fingerprint: identity.fingerprint,
    nearFingerprint: identity.nearFingerprint,
    signature: identity.signature,
    subject: question.subject || "Unknown",
    preview: identity.preview,
    createdAt: question.createdAt || new Date().toISOString()
  };
}

export function dedupeQuestions(questions = [], seen = {}) {
  const exactSeen = new Set(seen.fingerprints || []);
  const nearSeen = new Set(seen.nearFingerprints || []);
  const accepted = [];
  const rejected = [];

  for (const question of questions) {
    const identity = questionIdentity(question);
    if (exactSeen.has(identity.fingerprint)) {
      rejected.push({ question, identity, reason: "Exact duplicate" });
      continue;
    }
    if (nearSeen.has(identity.nearFingerprint)) {
      rejected.push({ question, identity, reason: "Near duplicate" });
      continue;
    }
    exactSeen.add(identity.fingerprint);
    nearSeen.add(identity.nearFingerprint);
    accepted.push({ ...question, ...identity });
  }

  return { accepted, rejected };
}
