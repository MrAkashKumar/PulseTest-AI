import { createClient } from "@supabase/supabase-js";

const EXAMS_KEY = "pulsetest-ai:exams:v1";
const RESEARCH_KEY = "pulsetest-ai:research:v1";
const PROFILE_KEY = "pulsetest-ai:profile:v1";
const PREFERENCES_KEY = "pulsetest-ai:preferences:v1";
const USAGE_KEY = "pulsetest-ai:usage:v1";
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
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

export async function saveExam(exam) {
  const exams = loadExams();
  const next = [exam, ...exams.filter((item) => item.id !== exam.id)].slice(0, 30);
  write(EXAMS_KEY, next);
  const supabase = cloudClient();
  if (supabase) {
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data } = await supabase.auth.signInAnonymously();
      user = data.user;
    }
    if (user) await supabase.from("exams").upsert({ id: exam.id, owner_id: user.id, payload: exam, updated_at: new Date().toISOString() });
  }
  return next;
}

export function deleteExam(id) {
  const next = loadExams().filter((item) => item.id !== id);
  write(EXAMS_KEY, next);
  return next;
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
