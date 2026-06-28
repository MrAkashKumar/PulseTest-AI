import { createClient } from "@supabase/supabase-js";
import { publicRuntimeConfig } from "./runtime-config";
import { rememberQuestionIdentity } from "./question-dedup";
import { buildQuestionArchive, buildQuestionArchiveEntry, normalizeTopicLabel } from "./question-history";

const EXAMS_KEY = "pulsetest-ai:exams:v1";
const RESEARCH_KEY = "pulsetest-ai:research:v1";
const PROFILE_KEY = "pulsetest-ai:profile:v1";
const PREFERENCES_KEY = "pulsetest-ai:preferences:v1";
const USAGE_KEY = "pulsetest-ai:usage:v1";
const QUESTION_MEMORY_KEY = "pulsetest-ai:question-memory:v1";
const QUESTION_ARCHIVE_KEY = "pulsetest-ai:question-archive:v1";
const SCHEDULES_KEY = "pulsetest-ai:schedules:v1";
const TUTOR_SESSION_KEY = "pulsetest-ai:tutor-session:v1";
const LEGACY_KEYS = {
  exams: "recall-lab:exams:v1", research: "recall-lab:research:v1", profile: "recall-lab:profile:v1",
  preferences: "recall-lab:preferences:v1", usage: "recall-lab:usage:v1", apiKey: "recall-lab:openai-key"
};

function read(key, fallback, legacyKey) {
  if (typeof window === "undefined") return fallback;
  try {
    const current = localStorage.getItem(key); const legacy = legacyKey ? localStorage.getItem(legacyKey) : null;
    const value = JSON.parse(current ?? legacy) ?? fallback;
    if (!current && legacy) write(key, value);
    return value;
  } catch { return fallback; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function cloudClient() {
  const { supabaseUrl: url, supabaseAnonKey: key } = publicRuntimeConfig();
  return url && key ? createClient(url, key) : null;
}

async function syncExamToCloud(exam) {
  const supabase = cloudClient();
  if (!supabase) return;
  try {
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data } = await supabase.auth.signInAnonymously();
      user = data.user;
    }
    if (user) {
      await supabase.from("exams").upsert({ id: exam.id, owner_id: user.id, payload: exam, updated_at: new Date().toISOString() });
    }
  } catch (error) {
    console.warn("Supabase exam sync skipped", error?.message || error);
  }
}

export function getProfile() {
  const existing = read(PROFILE_KEY, null, LEGACY_KEYS.profile);
  if (existing) return existing;
  const profile = { id: crypto.randomUUID(), name: "Doctor", streak: 0, lastStudyDate: null };
  write(PROFILE_KEY, profile);
  return profile;
}

export function saveProfile(profile) { write(PROFILE_KEY, profile); }
export function loadExams() { return read(EXAMS_KEY, [], LEGACY_KEYS.exams); }

export function loadQuestionMemory() {
  return read(QUESTION_MEMORY_KEY, []);
}

export function loadQuestionArchive() {
  const archive = read(QUESTION_ARCHIVE_KEY, []);
  if (archive.length) {
    const normalized = archive.map((entry) => ({
      ...entry,
      sourceTags: (entry.sourceTags || []).map(normalizeTopicLabel).filter(Boolean)
    }));
    if (JSON.stringify(normalized) !== JSON.stringify(archive)) write(QUESTION_ARCHIVE_KEY, normalized);
    return normalized;
  }
  const exams = loadExams();
  if (!exams.length) return [];
  const next = buildQuestionArchive(exams).slice(0, 5000);
  write(QUESTION_ARCHIVE_KEY, next);
  return next;
}

export function rememberQuestions(questions = []) {
  const previous = loadQuestionMemory();
  const byId = new Map(previous.map((entry) => [entry.fingerprint, entry]));
  for (const question of questions) {
    const identity = rememberQuestionIdentity(question);
    byId.set(identity.fingerprint, identity);
  }
  const next = [...byId.values()].slice(-1500);
  write(QUESTION_MEMORY_KEY, next);
  return next;
}

export function rememberQuestionArchive(exam) {
  const previous = loadQuestionArchive();
  const byId = new Map(previous.map((entry) => [entry.archiveId, entry]));
  for (const question of exam.questions || []) {
    const entry = buildQuestionArchiveEntry(exam, question);
    byId.set(entry.archiveId, entry);
  }
  const next = [...byId.values()]
    .sort((left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime())
    .slice(0, 5000);
  write(QUESTION_ARCHIVE_KEY, next);
  return next;
}

export async function saveExam(exam) {
  const exams = loadExams();
  const next = [exam, ...exams.filter((item) => item.id !== exam.id)].slice(0, 30);
  write(EXAMS_KEY, next);
  rememberQuestions(exam.questions || []);
  rememberQuestionArchive(exam);
  void syncExamToCloud(exam);
  return next;
}

export function deleteExam(id) {
  const next = loadExams().filter((item) => item.id !== id);
  write(EXAMS_KEY, next);
  return next;
}

export function loadSchedules() {
  return read(SCHEDULES_KEY, []);
}

export function saveSchedules(schedules = []) {
  const next = [...schedules].sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
  write(SCHEDULES_KEY, next);
  return next;
}

export function upsertSchedule(schedule) {
  const next = [schedule, ...loadSchedules().filter((item) => item.id !== schedule.id)];
  return saveSchedules(next);
}

export function deleteSchedule(id) {
  return saveSchedules(loadSchedules().filter((item) => item.id !== id));
}

export function loadResearch() { return read(RESEARCH_KEY, null, LEGACY_KEYS.research); }
export function saveResearch(research) { write(RESEARCH_KEY, research); }

export function loadSessionKey() {
  return typeof window === "undefined" ? "" : sessionStorage.getItem("pulsetest-ai:openai-key") || sessionStorage.getItem(LEGACY_KEYS.apiKey) || "";
}

export function saveSessionKey(key) {
  if (!key) { sessionStorage.removeItem("pulsetest-ai:openai-key"); sessionStorage.removeItem(LEGACY_KEYS.apiKey); }
  else { sessionStorage.setItem("pulsetest-ai:openai-key", key.trim()); sessionStorage.removeItem(LEGACY_KEYS.apiKey); }
}

export function getPreferences() {
  return read(PREFERENCES_KEY, { dailyQuestionLimit: 180, dailyResearchLimit: 3, adaptiveMode: true }, LEGACY_KEYS.preferences);
}

export function savePreferences(preferences) { write(PREFERENCES_KEY, preferences); }

export function loadTutorSession() {
  return read(TUTOR_SESSION_KEY, { previousResponseId: "", messages: [], useWorldSearch: false });
}

export function saveTutorSession(session) {
  write(TUTOR_SESSION_KEY, session);
}

export function clearTutorSession() {
  write(TUTOR_SESSION_KEY, { previousResponseId: "", messages: [], useWorldSearch: false });
}

export function getTodayUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const usage = read(USAGE_KEY, { date: today, questions: 0, research: 0 }, LEGACY_KEYS.usage);
  return usage.date === today ? usage : { date: today, questions: 0, research: 0 };
}

export function recordUsage(kind, amount = 1) {
  const usage = getTodayUsage();
  const next = { ...usage, [kind]: (usage[kind] || 0) + amount };
  write(USAGE_KEY, next);
  return next;
}
