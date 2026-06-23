import { createClient } from "@supabase/supabase-js";
import { openAIFromRequest, modelName } from "./openai-server";
import { researchSchema } from "./question-schema";
import { buildResearchPrompt } from "./prompts";
import { openAIConfig, serverSupabaseConfig } from "./runtime-config";

const memory = globalThis.__pulseTestAIResearch || globalThis.__recallLabResearch || { snapshot: null };
globalThis.__pulseTestAIResearch = memory;

function serviceClient() {
  const { url, serviceRoleKey: key } = serverSupabaseConfig();
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function getLatestResearch() {
  if (memory.snapshot) return memory.snapshot;
  const supabase = serviceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("research_snapshots").select("payload").order("created_at", { ascending: false }).limit(1).maybeSingle();
  memory.snapshot = data?.payload || null;
  return memory.snapshot;
}

export function extractSources(output = []) {
  const byUrl = new Map();
  for (const item of output) {
    for (const source of item?.action?.sources || []) {
      if (source?.url) byUrl.set(source.url, { title: source.title || new URL(source.url).hostname, url: source.url });
    }
    for (const content of item?.content || []) {
      for (const note of content?.annotations || []) {
        if (note?.type === "url_citation" && note.url) byUrl.set(note.url, { title: note.title || new URL(note.url).hostname, url: note.url });
      }
    }
  }
  return [...byUrl.values()].slice(0, 16);
}

export async function performResearch(request, { requireServerKey = false } = {}) {
  const openai = openAIFromRequest(request, { requireServerKey });
  const config = openAIConfig();
  const response = await openai.responses.create({
    model: modelName(),
    reasoning: { effort: config.researchEffort },
    tools: [{ type: "web_search", search_context_size: config.researchSearchContextSize, user_location: { type: "approximate", country: "IN" } }],
    tool_choice: "auto",
    include: ["web_search_call.action.sources"],
    input: buildResearchPrompt(new Date().toISOString()),
    text: { format: { type: "json_schema", name: "neet_pg_trend_research", strict: true, schema: researchSchema } }
  });
  const parsed = JSON.parse(response.output_text);
  const snapshot = { ...parsed, sources: extractSources(response.output), model: modelName() };
  memory.snapshot = snapshot;
  const supabase = serviceClient();
  if (supabase) await supabase.from("research_snapshots").insert({ payload: snapshot });
  return snapshot;
}
