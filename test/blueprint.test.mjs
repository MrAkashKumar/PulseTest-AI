import assert from "node:assert/strict";
import test from "node:test";
import { allocateSubjects, buildBatchPlan } from "../lib/constants.js";
import { demoExam } from "../lib/demo-exam.js";
import { adaptivePromptFromExams, analyzePerformance, examSubjectBreakdown } from "../lib/analytics.js";
import { validateQuestionBatch } from "../lib/question-quality.js";
import { dedupeQuestions, questionIdentity } from "../lib/question-dedup.js";
import { buildQuestionArchive, summarizeQuestionArchive } from "../lib/question-history.js";
import { certificateForResult } from "../lib/certification.js";
import { buildTimingMeta, NEET_SECONDS_PER_QUESTION } from "../lib/exam-timing.js";
import { buildPromptCacheKey } from "../lib/prompt-cache-key.js";
import { expandQuestionBatchPayload } from "../lib/question-schema.js";

test("180-question blueprint matches the requested weightage", () => {
  assert.deepEqual(allocateSubjects(180), [
    { subject: "Medicine", count: 60 },
    { subject: "OBGY", count: 25 },
    { subject: "Surgery", count: 20 },
    { subject: "Pathology", count: 15 },
    { subject: "Pharmacology", count: 15 },
    { subject: "Microbiology", count: 10 },
    { subject: "PSM", count: 10 },
    { subject: "Integrated subjects", count: 25 }
  ]);
});

test("batch plan never exceeds ten and preserves total", () => {
  const plan = buildBatchPlan(180);
  assert.equal(plan.length, 18);
  assert.equal(plan.reduce((sum, batch) => sum + batch.count, 0), 180);
  assert.ok(plan.every((batch) => batch.count <= 10));
});

test("demo answer reviews are complete", () => {
  assert.equal(demoExam.questions.length, 5);
  for (const question of demoExam.questions) {
    assert.equal(question.options.length, 4);
    assert.ok(question.options.some((option) => option.id === question.correctOptionId));
    assert.equal(question.whyOthersWrong.length, 3);
    assert.ok(question.trap && question.clue && question.memoryTip);
  }
});

test("performance engine finds weak subjects and projects to 180", () => {
  const answers = Object.fromEntries(demoExam.questions.map((question, index) => [question.id, index < 3 ? question.correctOptionId : "A"]));
  const exam = { ...demoExam, status: "completed", completedAt: "2026-06-22T10:00:00.000Z", answers, result: { correct: 3, incorrect: 2, unanswered: 0, percentage: 55, accuracy: 60 } };
  const analysis = analyzePerformance([exam]);
  assert.equal(analysis.projectedCorrect180, 108);
  assert.equal(analysis.totalQuestions, 5);
  assert.ok(analysis.weaknesses.length > 0);
  assert.match(adaptivePromptFromExams([exam]), /Candidate model/);
  assert.equal(examSubjectBreakdown(exam).reduce((sum, item) => sum + item.total, 0), 5);
});

test("quality gate accepts an audited key and rejects ambiguity", () => {
  const audited = { ...demoExam.questions[0], evidenceLevel: "Established standard", timeSensitivity: "Stable", answerCheck: "The haemodynamic pattern uniquely requires cautious preload support before reperfusion." };
  assert.equal(validateQuestionBatch([audited], 1).length, 1);
  const duplicate = { ...audited, options: audited.options.map((option, index) => index === 3 ? { ...option, text: audited.options[0].text } : option) };
  assert.throws(() => validateQuestionBatch([duplicate], 1), /duplicate options/);
});

test("question identity stays stable and dedupe rejects repeats", () => {
  const audited = { ...demoExam.questions[1], evidenceLevel: "Established standard", timeSensitivity: "Stable", answerCheck: "HELLP syndrome at 34 weeks with maternal disease progression requires delivery because it is the only definitive treatment in this exact stem." };
  const identityA = questionIdentity(audited);
  const identityB = questionIdentity({ ...audited, stem: `${audited.stem} ` });
  assert.equal(identityA.fingerprint, identityB.fingerprint);
  const { accepted, rejected } = dedupeQuestions([audited, { ...audited }]);
  assert.equal(accepted.length, 1);
  assert.equal(rejected.length, 1);
});

test("question archive preserves paper flow and subject mix context", () => {
  const exam = {
    ...demoExam,
    id: "exam-1",
    title: "Grand Test Alpha",
    createdAt: "2026-06-23T08:30:00.000Z",
    status: "completed",
    completedAt: "2026-06-23T10:00:00.000Z",
    config: { difficulty: "Moderate to high", mode: "NEET PG 2026 + AIIMS/INI-CET integrated", usedResearch: true, adaptiveMode: true, subjects: ["Medicine", "OBGY"] },
    answers: {
      [demoExam.questions[0].id]: demoExam.questions[0].correctOptionId,
      [demoExam.questions[1].id]: "A"
    },
    result: { correct: 1, incorrect: 1, unanswered: 3, percentage: 20, accuracy: 50 }
  };
  const archive = buildQuestionArchive([exam]);
  assert.equal(archive.length, 5);
  assert.equal(archive[0].paperSubjectMix.reduce((sum, item) => sum + item.count, 0), 5);
  assert.equal(archive.find((item) => item.questionId === demoExam.questions[0].id).answerStatus, "correct");
  assert.equal(archive.find((item) => item.questionId === demoExam.questions[1].id).answerStatus, "wrong");
  const summary = summarizeQuestionArchive(archive);
  assert.equal(summary.totalPapers, 1);
  assert.ok(summary.subjects.length > 0);
  assert.ok(summary.topics.length > 0);
});

test("certificate tiers reward exam readiness without hiding weak attempts", () => {
  assert.equal(certificateForResult({ percentage: 90, correct: 18, incorrect: 2, unanswered: 0 }, 20).tier, "diamond");
  assert.equal(certificateForResult({ percentage: 75, correct: 15, incorrect: 4, unanswered: 1 }, 20).tier, "gold");
  assert.equal(certificateForResult({ percentage: 55, correct: 12, incorrect: 6, unanswered: 2 }, 20).tier, "silver");
  assert.equal(certificateForResult({ percentage: 35, correct: 8, incorrect: 9, unanswered: 3 }, 20).tier, "practice");
});

test("timing metadata stays locked to the NEET rate of 60 seconds per question", () => {
  assert.equal(NEET_SECONDS_PER_QUESTION, 60);
  assert.deepEqual(buildTimingMeta(10), { q: 10, spq: 60, sec: 600 });
  assert.deepEqual(buildTimingMeta(180), { q: 180, spq: 60, sec: 10800 });
});

test("prompt cache keys stay stable and within the OpenAI 64 character limit", () => {
  const key = buildPromptCacheKey("generate", {
    difficulty: "Moderate to high",
    subjects: ["Medicine:60", "OBGY:25", "Integrated subjects:25"],
    useWebSearch: false
  });
  assert.ok(key.length <= 64);
  assert.equal(key, buildPromptCacheKey("generate", {
    difficulty: "Moderate to high",
    subjects: ["Medicine:60", "OBGY:25", "Integrated subjects:25"],
    useWebSearch: false
  }));
});

test("compact question payload expands back into the app question shape", () => {
  const expanded = expandQuestionBatchPayload({
    qs: [{
      sj: "Medicine",
      is: ["Cardiology", "Pharmacology"],
      se: "Emergency",
      df: "Hard",
      st: "A 58-year-old man presents with chest pain and shock after 90 minutes.",
      op: [{ i: "A", t: "Option A" }, { i: "B", t: "Option B" }, { i: "C", t: "Option C" }, { i: "D", t: "Option D" }],
      ca: "B",
      ex: "Explanation text that is long enough to be meaningful.",
      wo: [{ i: "A", r: "Wrong reason A" }, { i: "C", r: "Wrong reason C" }, { i: "D", r: "Wrong reason D" }],
      tr: "Trap text",
      cl: "Clue text",
      mt: "Memory tip",
      tg: ["ACS", "Shock"],
      ev: "Established standard",
      ts: "Stable",
      ac: "Answer audit text that confirms the keyed option is uniquely correct."
    }]
  });
  assert.equal(expanded.questions[0].subject, "Medicine");
  assert.equal(expanded.questions[0].options[1].id, "B");
  assert.equal(expanded.questions[0].whyOthersWrong[0].optionId, "A");
  assert.equal(expanded.questions[0].answerCheck.includes("uniquely correct"), true);
});
