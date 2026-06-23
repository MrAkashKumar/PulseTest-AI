export const NEET_SECONDS_PER_QUESTION = 60;

export function buildTimingMeta(questionCount = 0) {
  const q = Number.isFinite(Number(questionCount)) ? Math.max(0, Math.floor(Number(questionCount))) : 0;
  return {
    q,
    spq: NEET_SECONDS_PER_QUESTION,
    sec: q * NEET_SECONDS_PER_QUESTION
  };
}
