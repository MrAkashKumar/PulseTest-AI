import { questionIdentity } from "./question-dedup.js";

function normalizeList(values = []) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

export function normalizeTopicLabel(value = "") {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, "$1")
    .replace(/\((https?:\/\/[^)]+)\)/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\butm_source=\w+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function paperSubjectMix(questions = []) {
  const counts = questions.reduce((acc, question) => {
    const subject = question.subject || "Unknown";
    acc[subject] = (acc[subject] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((left, right) => right.count - left.count || left.subject.localeCompare(right.subject));
}

function answerState(exam = {}, question = {}) {
  const selected = exam.answers?.[question.id] || "";
  if (exam.status !== "completed") return { candidateAnswer: selected, answerStatus: selected ? "in-progress" : "generated" };
  if (!selected) return { candidateAnswer: "", answerStatus: "unanswered" };
  return { candidateAnswer: selected, answerStatus: selected === question.correctOptionId ? "correct" : "wrong" };
}

export function buildQuestionArchiveEntry(exam = {}, question = {}) {
  const identity = questionIdentity(question);
  const response = answerState(exam, question);
  const mix = paperSubjectMix(exam.questions || []);
  const generatedAt = exam.createdAt || question.createdAt || new Date().toISOString();
  return {
    archiveId: `${exam.id || "paper"}:${question.id || question.number || identity.fingerprint}`,
    examId: exam.id || "",
    examTitle: exam.title || "Untitled paper",
    examStatus: exam.status || "ready",
    generatedAt,
    completedAt: exam.completedAt || null,
    questionId: question.id || "",
    number: question.number || null,
    paperCount: exam.questions?.length || 0,
    paperDifficulty: exam.config?.difficulty || question.difficulty || "",
    paperMode: exam.config?.mode || "",
    usedResearch: Boolean(exam.config?.usedResearch),
    adaptiveMode: Boolean(exam.config?.adaptiveMode),
    selectedSubjects: normalizeList(exam.config?.subjects),
    paperSubjectMix: mix,
    subject: question.subject || "Unknown",
    integratedSubjects: normalizeList(question.integratedSubjects),
    setting: question.setting || "",
    difficulty: question.difficulty || "",
    stem: question.stem || "",
    options: Array.isArray(question.options) ? question.options : [],
    correctOptionId: question.correctOptionId || "",
    explanation: question.explanation || "",
    whyOthersWrong: Array.isArray(question.whyOthersWrong) ? question.whyOthersWrong : [],
    trap: question.trap || "",
    clue: question.clue || "",
    memoryTip: question.memoryTip || "",
    sourceTags: normalizeList(question.sourceTags).map(normalizeTopicLabel).filter(Boolean),
    evidenceLevel: question.evidenceLevel || "",
    timeSensitivity: question.timeSensitivity || "",
    answerCheck: question.answerCheck || "",
    researchSources: Array.isArray(question.researchSources) ? question.researchSources : [],
    isFlagged: Boolean(exam.flags?.includes(question.id)),
    candidateAnswer: response.candidateAnswer,
    answerStatus: response.answerStatus,
    fingerprint: question.fingerprint || identity.fingerprint,
    nearFingerprint: question.nearFingerprint || identity.nearFingerprint,
    signature: question.signature || identity.signature,
    preview: identity.preview
  };
}

export function buildQuestionArchive(exams = []) {
  const byId = new Map();
  for (const exam of exams) {
    for (const question of exam.questions || []) {
      const entry = buildQuestionArchiveEntry(exam, question);
      byId.set(entry.archiveId, entry);
    }
  }
  return [...byId.values()].sort((left, right) => {
    const timeDiff = new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (left.number || 0) - (right.number || 0);
  });
}

function countBy(records, pick) {
  const counts = new Map();
  for (const record of records) {
    const values = [].concat(pick(record)).filter(Boolean);
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function summarizeQuestionArchive(records = []) {
  const uniquePapers = new Map();
  for (const record of records) {
    if (!uniquePapers.has(record.examId)) {
      uniquePapers.set(record.examId, {
        examId: record.examId,
        title: record.examTitle,
        generatedAt: record.generatedAt,
        status: record.examStatus,
        count: record.paperCount,
        mix: record.paperSubjectMix
      });
    }
  }
  const statusCounts = countBy(records, (record) => record.answerStatus);
  return {
    totalQuestions: records.length,
    totalPapers: uniquePapers.size,
    subjects: countBy(records, (record) => record.subject),
    topics: countBy(records, (record) => record.sourceTags.map(normalizeTopicLabel)),
    settings: countBy(records, (record) => record.setting),
    statuses: statusCounts,
    completedQuestions: statusCounts.find((item) => item.label === "correct")?.count || 0,
    wrongQuestions: statusCounts.find((item) => item.label === "wrong")?.count || 0,
    recentPapers: [...uniquePapers.values()]
      .sort((left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime())
      .slice(0, 8)
  };
}
