const ALLOWED_REASONING_EFFORTS = ["low", "medium", "high"];
const ALLOWED_SEARCH_CONTEXT_SIZES = ["low", "medium", "high"];

const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_OPENAI_MODEL = "gpt-5.5";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeChoice(value, allowed, fallback) {
  const normalized = clean(value).toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeAppUrl(value) {
  return clean(value).replace(/\/+$/, "") || DEFAULT_APP_URL;
}

export function resolveReasoningEffort(value, fallback = "medium") {
  return normalizeChoice(value, ALLOWED_REASONING_EFFORTS, fallback);
}

export function resolveSearchContextSize(value, fallback = "medium") {
  return normalizeChoice(value, ALLOWED_SEARCH_CONTEXT_SIZES, fallback);
}

export function publicRuntimeConfig() {
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return {
    appUrl: normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL),
    supabaseUrl,
    supabaseAnonKey,
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey)
  };
}

export function openAIConfig() {
  return {
    apiKey: clean(process.env.OPENAI_API_KEY),
    model: clean(process.env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
    generationEffort: resolveReasoningEffort(process.env.OPENAI_REASONING_EFFORT, "medium"),
    researchEffort: resolveReasoningEffort(process.env.OPENAI_RESEARCH_REASONING_EFFORT, "medium"),
    searchContextSize: resolveSearchContextSize(process.env.OPENAI_SEARCH_CONTEXT_SIZE, "medium"),
    researchSearchContextSize: resolveSearchContextSize(process.env.OPENAI_RESEARCH_CONTEXT_SIZE, "medium")
  };
}

export function serverSupabaseConfig() {
  const publicConfig = publicRuntimeConfig();
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    url: publicConfig.supabaseUrl,
    anonKey: publicConfig.supabaseAnonKey,
    serviceRoleKey,
    configured: publicConfig.supabaseConfigured,
    serviceRoleConfigured: Boolean(serviceRoleKey),
    researchSyncEnabled: Boolean(publicConfig.supabaseUrl && serviceRoleKey)
  };
}

export function cronConfig() {
  const secret = clean(process.env.CRON_SECRET);
  return {
    secret,
    configured: Boolean(secret)
  };
}

export function runtimeHealthSnapshot() {
  const publicConfig = publicRuntimeConfig();
  const openai = openAIConfig();
  const supabase = serverSupabaseConfig();
  const cron = cronConfig();

  return {
    ok: true,
    appName: "PulseTest-AI",
    appUrl: publicConfig.appUrl,
    openaiConfigured: Boolean(openai.apiKey),
    supabaseConfigured: supabase.configured,
    config: {
      openai: {
        configured: Boolean(openai.apiKey),
        model: openai.model,
        generationEffort: openai.generationEffort,
        researchEffort: openai.researchEffort,
        searchContextSize: openai.searchContextSize,
        researchSearchContextSize: openai.researchSearchContextSize,
        sessionKeySupported: true
      },
      supabase: {
        configured: supabase.configured,
        serviceRoleConfigured: supabase.serviceRoleConfigured,
        researchSyncEnabled: supabase.researchSyncEnabled
      },
      cron: {
        configured: cron.configured
      },
      optimization: {
        promptContract: "compact-v1",
        timingRule: "sec=q*60",
        cacheKeyPolicy: "short-versioned",
        generationOutputBudget: "dynamic"
      }
    }
  };
}
