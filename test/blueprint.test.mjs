import assert from "node:assert/strict";
import test from "node:test";
import { allocateSubjects, buildBatchPlan } from "../lib/constants.js";
import { demoExam } from "../lib/demo-exam.js";
import { adaptivePromptFromExams, analyzePerformance, examSubjectBreakdown } from "../lib/analytics.js";
import { validateQuestionBatch } from "../lib/question-quality.js";
import { dedupeQuestions, questionIdentity } from "../lib/question-dedup.js";
import { buildQuestionArchive, summarizeQuestionArchive } from "../lib/question-history.js";

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
