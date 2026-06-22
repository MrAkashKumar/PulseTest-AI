export function validateQuestionBatch(questions, expectedCount) {
  function reject(message) { const error = new Error(message); error.status = 422; throw error; }
  if (!Array.isArray(questions) || questions.length !== expectedCount) {
    reject(`Expected ${expectedCount} validated questions.`);
  }
  for (const [index, question] of questions.entries()) {
    const label = `Question ${index + 1}`;
    const optionIds = question.options?.map((option) => option.id) || [];
    const optionTexts = question.options?.map((option) => option.text.trim().toLowerCase()) || [];
    if (optionIds.join("") !== "ABCD" || new Set(optionTexts).size !== 4) reject(`${label} has invalid or duplicate options. Regenerate the batch.`);
    if (!optionIds.includes(question.correctOptionId)) reject(`${label} has no valid answer key. Regenerate the batch.`);
    const reviewedIds = question.whyOthersWrong?.map((item) => item.optionId).sort() || [];
    const expectedWrong = optionIds.filter((id) => id !== question.correctOptionId).sort();
    if (reviewedIds.join("") !== expectedWrong.join("") || new Set(reviewedIds).size !== 3) reject(`${label} has an inconsistent distractor review. Regenerate the batch.`);
    if (!question.answerCheck || question.answerCheck.trim().length < 24) reject(`${label} did not pass the answer-certainty check. Regenerate the batch.`);
    if (!question.explanation || question.explanation.trim().length < 40) reject(`${label} has an insufficient explanation. Regenerate the batch.`);
    if (!/\d/.test(question.stem) || question.stem.length < 100) reject(`${label} is not a complete clinical scenario. Regenerate the batch.`);
  }
  return questions;
}
