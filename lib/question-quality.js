import { dedupeQuestions } from "./question-dedup.js";

export function validateQuestionBatch(questions, expectedCount) {
  function reject(message) { const error = new Error(message); error.status = 422; throw error; }
  if (!Array.isArray(questions) || questions.length !== expectedCount) {
    reject(`Expected ${expectedCount} validated questions.`);
  }
  const { rejected } = dedupeQuestions(questions);
  if (rejected.length) reject(`Question batch contains duplicate or near-duplicate items. Regenerate the batch.`);
  for (const [index, question] of questions.entries()) {
    const label = `Question ${index + 1}`;
    const optionIds = question.options?.map((option) => option.id) || [];
    const optionTexts = question.options?.map((option) => option.text.trim().toLowerCase()) || [];
    if (optionIds.join("") !== "ABCD" || new Set(optionTexts).size !== 4) reject(`${label} has invalid or duplicate options. Regenerate the batch.`);
    if (!optionIds.includes(question.correctOptionId)) reject(`${label} has no valid answer key. Regenerate the batch.`);
    const reviewedIds = question.whyOthersWrong?.map((item) => item.optionId).sort() || [];
    const expectedWrong = optionIds.filter((id) => id !== question.correctOptionId).sort();
    if (reviewedIds.join("") !== expectedWrong.join("") || new Set(reviewedIds).size !== 3) reject(`${label} has an inconsistent distractor review. Regenerate the batch.`);
    if (!question.answerCheck || question.answerCheck.trim().length < 40) reject(`${label} did not pass the answer-certainty check. Regenerate the batch.`);
    if (!question.explanation || question.explanation.trim().length < 70) reject(`${label} has an insufficient explanation. Regenerate the batch.`);
    if (!question.trap || question.trap.trim().length < 28) reject(`${label} does not explain the trap clearly enough. Regenerate the batch.`);
    if (!question.clue || question.clue.trim().length < 18) reject(`${label} does not explain the decisive clue clearly enough. Regenerate the batch.`);
    if ((question.whyOthersWrong || []).some((item) => !item.reason || item.reason.trim().length < 24)) reject(`${label} has weak distractor explanations. Regenerate the batch.`);
    if ((question.integratedSubjects || []).some((item) => !item || item.trim().length < 3 || item.trim().length > 32)) reject(`${label} has weak integrated-subject labels. Regenerate the batch.`);
    if ((question.sourceTags || []).some((tag) => !tag || tag.trim().length < 2 || tag.trim().length > 48 || /https?:\/\//i.test(tag) || /\[[^\]]+\]\(/.test(tag))) reject(`${label} has non-standard source tags. Use concise NEET-PG topic labels only.`);
    if (!/\d/.test(question.stem) || question.stem.length < 120) reject(`${label} is not a complete clinical scenario. Regenerate the batch.`);
    if (!/\b(man|woman|male|female|boy|girl|pregnan|gentleman|lady)\b/i.test(question.stem)) reject(`${label} must state patient sex or pregnancy context. Regenerate the batch.`);
  }
  return questions;
}
