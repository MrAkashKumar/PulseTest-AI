import { adaptivePromptFromExams, funTestName } from "./analytics";
import { buildBatchPlan } from "./constants";
import { getPreferences, getTodayUsage, loadQuestionMemory, loadSessionKey, recordUsage, saveResearch } from "./client-store";
import { buildTimingMeta } from "./exam-timing";

export function summarizeResearch(research) {
  if (!research) return "";
  const summary = String(research.summary || "").replace(/\s+/g, " ").trim();
  const signals = (research.examSignals || []).slice(0, 5).join("; ");
  const topics = (research.highYieldTopics || []).slice(0, 8).map((item) => `${item.subject}:${item.topic}`).join("; ");
  const watch = (research.diseaseWatch || []).slice(0, 4).map((item) => `${item.disease}:${item.examAngle}`).join("; ");
  return [summary, signals ? `Signals: ${signals}` : "", topics ? `Topics: ${topics}` : "", watch ? `Watch: ${watch}` : ""].filter(Boolean).join("\n");
}

async function callApi(path, body) {
  const key = loadSessionKey();
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { "x-openai-key": key } : {}) },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = response.status;
    throw err;
  }
  return data;
}

export async function generateExamDraft({
  count,
  difficulty,
  subjects,
  customPrompt = "",
  useResearch = true,
  adaptiveMode = true,
  exams = [],
  research = null,
  questionMemory = loadQuestionMemory(),
  title,
  schedule = null,
  onProgress,
  onResearch
}) {
  const preferences = getPreferences();
  const initialUsage = getTodayUsage();
  if (initialUsage.questions + count > preferences.dailyQuestionLimit) {
    throw new Error(`This would exceed today's ${preferences.dailyQuestionLimit}-question limit. Change it in Settings or choose a shorter paper.`);
  }

  let activeResearch = research;
  if (useResearch && (!research || Date.now() - new Date(research.generatedAt).getTime() > 24 * 60 * 60 * 1000)) {
    if (initialUsage.research >= preferences.dailyResearchLimit) throw new Error("Deep Search limit reached. Use the saved brief or raise the limit in Settings.");
    onProgress?.({ done: 0, total: count, label: "Refreshing the exam signal map..." });
    const data = await callApi("/api/research", {});
    activeResearch = data.research;
    saveResearch(activeResearch);
    onResearch?.(activeResearch);
    recordUsage("research", 1);
  }

  const plan = buildBatchPlan(count, subjects, 10);
  const timing = buildTimingMeta(count);
  const questions = [];
  const coveredTopics = [];
  const adaptiveProfile = adaptiveMode ? adaptivePromptFromExams(exams) : "Adaptive mode disabled; follow the requested subject blueprint without candidate-history weighting.";
  const seenFingerprints = questionMemory.map((item) => item.fingerprint);
  const seenNearFingerprints = questionMemory.map((item) => item.nearFingerprint);
  const seenQuestionSignatures = questionMemory.map((item) => item.signature);
  const researchBrief = useResearch ? summarizeResearch(activeResearch) : "";

  for (let index = 0; index < plan.length; index += 1) {
    const batch = plan[index];
    onProgress?.({ done: questions.length, total: count, label: `Setting paper - batch ${index + 1} of ${plan.length}` });
    const data = await callApi("/api/generate", {
      ...batch,
      difficulty,
      mode: "NEET PG 2026 + AIIMS/INI-CET integrated",
      customPrompt,
      researchBrief,
      coveredTopics,
      adaptiveProfile,
      reasoningEffort: count >= 60 ? "medium" : "high",
      useWebSearch: false,
      seenFingerprints,
      seenNearFingerprints,
      seenQuestionSignatures
    });
    questions.push(...data.questions.map((question) => ({ ...question, researchSources: data.sources || [] })));
    coveredTopics.push(...data.questions.flatMap((q) => q.sourceTags));
    seenFingerprints.push(...data.questions.map((question) => question.fingerprint).filter(Boolean));
    seenNearFingerprints.push(...data.questions.map((question) => question.nearFingerprint).filter(Boolean));
    seenQuestionSignatures.push(...data.questions.map((question) => question.signature).filter(Boolean));
  }

  onProgress?.({ done: count, total: count, label: "Paper ready" });
  recordUsage("questions", count);

  return {
    id: crypto.randomUUID(),
    title: title || funTestName(count),
    createdAt: new Date().toISOString(),
    status: "ready",
    config: { count, difficulty, subjects, customPrompt, usedResearch: useResearch, adaptiveMode, adaptiveProfile, schedule, timing },
    questions
  };
}
