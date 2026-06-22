import { SUBJECTS } from "./constants.js";

export function analyzePerformance(exams = []) {
  const completed = exams.filter((exam) => exam.status === "completed" && exam.result).sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  const subjectMap = new Map(SUBJECTS.map((subject) => [subject, { subject, total: 0, attempted: 0, correct: 0, incorrect: 0, tags: new Map() }]));
  const dailyMap = new Map();

  for (const exam of completed) {
    const day = new Date(exam.completedAt || exam.createdAt).toISOString().slice(0, 10);
    const daily = dailyMap.get(day) || { date: day, tests: 0, questions: 0, correct: 0, percentages: [] };
    daily.tests += 1;
    daily.questions += exam.questions.length;
    daily.correct += exam.result.correct;
    daily.percentages.push(exam.result.percentage);
    dailyMap.set(day, daily);

    for (const question of exam.questions) {
      const key = subjectMap.has(question.subject) ? question.subject : "Integrated subjects";
      const stats = subjectMap.get(key);
      const answer = exam.answers?.[question.id];
      stats.total += 1;
      if (answer) stats.attempted += 1;
      if (answer === question.correctOptionId) stats.correct += 1;
      else if (answer) {
        stats.incorrect += 1;
        for (const tag of question.sourceTags || []) stats.tags.set(tag, (stats.tags.get(tag) || 0) + 1);
      }
    }
  }

  const subjects = [...subjectMap.values()].filter((item) => item.total > 0).map((item) => ({
    subject: item.subject,
    total: item.total,
    attempted: item.attempted,
    correct: item.correct,
    incorrect: item.incorrect,
    accuracy: item.attempted ? Math.round(item.correct / item.attempted * 100) : 0,
    coverage: item.total,
    weakTags: [...item.tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag]) => tag)
  })).sort((a, b) => b.accuracy - a.accuracy);

  const daily = [...dailyMap.values()].map((item) => ({
    ...item,
    percentage: Math.round(item.percentages.reduce((sum, value) => sum + value, 0) / item.percentages.length)
  }));
  const totalQuestions = completed.reduce((sum, exam) => sum + exam.questions.length, 0);
  const totalCorrect = completed.reduce((sum, exam) => sum + exam.result.correct, 0);
  const totalAttempted = completed.reduce((sum, exam) => sum + exam.result.correct + exam.result.incorrect, 0);
  const recent = completed.slice(-5);
  const recentAverage = recent.length ? Math.round(recent.reduce((sum, exam) => sum + exam.result.percentage, 0) / recent.length) : 0;
  const previous = completed.slice(-10, -5);
  const previousAverage = previous.length ? Math.round(previous.reduce((sum, exam) => sum + exam.result.percentage, 0) / previous.length) : recentAverage;
  const projectedCorrect180 = totalQuestions ? Math.min(180, Math.round(totalCorrect / totalQuestions * 180)) : 0;
  const readiness = Math.min(100, Math.round(recentAverage * .7 + Math.min(completed.length * 3, 15) + Math.min(daily.length * 2, 15)));

  return {
    completed,
    subjects,
    strengths: subjects.filter((item) => item.accuracy >= 70).slice(0, 3),
    weaknesses: [...subjects].sort((a, b) => a.accuracy - b.accuracy).filter((item) => item.accuracy < 70).slice(0, 4),
    daily,
    totalQuestions,
    totalCorrect,
    totalAttempted,
    overallAccuracy: totalAttempted ? Math.round(totalCorrect / totalAttempted * 100) : 0,
    recentAverage,
    trend: recentAverage - previousAverage,
    projectedCorrect180,
    readiness
  };
}

export function buildStudyPath(analysis) {
  if (!analysis.completed.length) return [
    { step: 1, title: "Set your baseline", detail: "Complete the five-question clinical sprint, then one 20-question mixed test.", tone: "start" },
    { step: 2, title: "Reveal the pattern", detail: "Review every trap and explain the decisive clue aloud.", tone: "build" },
    { step: 3, title: "Start adaptive mode", detail: "Let PulseTest-AI increase difficulty only after accuracy stabilizes.", tone: "test" }
  ];
  const weak = analysis.weaknesses;
  if (!weak.length) {
    const strongest = analysis.strengths[0]?.subject || "mixed subjects";
    return [
      { step: 1, title: `Stretch ${strongest}`, detail: "Move to examiner-mode cases with closer distractors and two-step decisions.", tone: "start" },
      { step: 2, title: "Protect against forgetting", detail: "Revisit today’s traps after 48 hours with a related-question variation.", tone: "build" },
      { step: 3, title: "Widen the sample", detail: "Attempt a 20-question mixed paper before treating this accuracy as stable.", tone: "test" }
    ];
  }
  return weak.slice(0, 3).map((item, index) => ({
    step: index + 1,
    title: index === 0 ? `Repair ${item.subject}` : index === 1 ? `Interleave ${item.subject}` : `Retest ${item.subject}`,
    detail: index === 0
      ? `Review ${item.weakTags.join(", ") || "your missed decision points"}; then solve 15 moderate clinical cases.`
      : index === 1
        ? `Mix 10 ${item.subject} questions with your strongest subject to improve discrimination.`
        : `Attempt an examiner-mode set after 48 hours. Target ≥75% accuracy before raising difficulty.`,
    tone: index === 0 ? "start" : index === 1 ? "build" : "test"
  }));
}

export function adaptivePromptFromExams(exams) {
  const analysis = analyzePerformance(exams);
  if (!analysis.completed.length) return "No prior performance data. Establish a balanced baseline at moderate-to-high difficulty.";
  const weak = analysis.weaknesses.map((item) => `${item.subject} ${item.accuracy}% accuracy; missed tags: ${item.weakTags.join(", ") || "mixed"}`).join(" | ");
  const strong = analysis.strengths.map((item) => `${item.subject} ${item.accuracy}%`).join(", ") || "none established";
  const difficulty = analysis.recentAverage >= 78 ? "Increase one level: use harder two-step decisions and closer distractors." : analysis.recentAverage >= 58 ? "Keep hard clinical reasoning but reinforce weak decision points." : "Keep scenarios challenging while testing foundational hinges before rare zebras.";
  return `Candidate model: recent weighted score ${analysis.recentAverage}%; projected ${analysis.projectedCorrect180}/180 correct; weak areas: ${weak || "not enough data"}; strengths: ${strong}. ${difficulty} Allocate about 60% of questions to weak areas, 25% to spaced retrieval of previous errors, and 15% to strengths at higher difficulty. Do not repeat stems.`;
}

const FUN_NAMES = [
  "The Consultant Raised One Eyebrow",
  "Two Correct-Looking Options Enter the ICU",
  "The ECG Said Plot Twist",
  "Sodium Was Fine Until It Wasn’t",
  "Ward Round: No Hints Were Given",
  "The Differential Diagnosis Strikes Back",
  "One More ABG Before Coffee",
  "The Gold Standard Has Entered the Chat"
];

export function funTestName(count) {
  if (count === 180) return "Grand Test: The Consultant Is Watching";
  const index = (new Date().getDate() + count) % FUN_NAMES.length;
  return `${FUN_NAMES[index]} · ${count}Q`;
}

export function examSubjectBreakdown(exam) {
  const map = new Map();
  for (const question of exam.questions) {
    const item = map.get(question.subject) || { subject: question.subject, total: 0, correct: 0, incorrect: 0 };
    item.total += 1;
    const answer = exam.answers?.[question.id];
    if (answer === question.correctOptionId) item.correct += 1;
    else if (answer) item.incorrect += 1;
    map.set(question.subject, item);
  }
  return [...map.values()].map((item) => ({ ...item, accuracy: Math.round(item.correct / item.total * 100) })).sort((a, b) => a.accuracy - b.accuracy);
}
