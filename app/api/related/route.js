import { NextResponse } from "next/server";
import { openAIFromRequest, modelName, safeApiError } from "@/lib/openai-server";
import { questionBatchSchema } from "@/lib/question-schema";
import { buildRelatedQuestionPrompt } from "@/lib/prompts";
import { extractSources } from "@/lib/research-server";
import { openAIConfig } from "@/lib/runtime-config";
import { dedupeQuestions, questionIdentity } from "@/lib/question-dedup";
import { validateQuestionBatch } from "@/lib/question-quality";

export const runtime = "nodejs";
export const maxDuration = 180;

const AUTHORITATIVE_DOMAINS = [
  "natboard.edu.in", "aiimsexams.ac.in", "who.int", "icmr.gov.in",
  "ncdc.mohfw.gov.in", "mohfw.gov.in", "pib.gov.in", "nmc.org.in",
  "pubmed.ncbi.nlm.nih.gov", "clinicaltrials.gov", "naco.gov.in",
  "tbcindia.gov.in", "ncvbdc.mohfw.gov.in", "nhm.gov.in"
];

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.sourceQuestion?.stem || !body.sourceQuestion?.correctOptionId) {
      return NextResponse.json({ error: "A completed source question is required." }, { status: 400 });
    }
    const openai = openAIFromRequest(request);
    const config = openAIConfig();
    const sourceIdentity = questionIdentity(body.sourceQuestion);
    let chosen = null;
    let response = null;

    for (let attempt = 0; attempt < 3 && !chosen; attempt += 1) {
      response = await openai.responses.create({
        model: modelName(),
        reasoning: { effort: config.generationEffort },
        tools: [{
          type: "web_search",
          search_context_size: config.searchContextSize,
          user_location: { type: "approximate", country: "IN" },
          filters: { allowed_domains: AUTHORITATIVE_DOMAINS }
        }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        max_tool_calls: 1,
        store: false,
        prompt_cache_key: "pulsetest-ai:related-question",
        input: buildRelatedQuestionPrompt(body),
        text: { format: { type: "json_schema", name: "related_neet_pg_question", strict: true, schema: questionBatchSchema(1) } }
      });
      if (response.status === "incomplete") throw new Error("The related question response was incomplete. Please retry.");
      const validated = validateQuestionBatch(JSON.parse(response.output_text).questions, 1);
      const deduped = dedupeQuestions(validated, {
        fingerprints: [sourceIdentity.fingerprint, ...(Array.isArray(body.seenFingerprints) ? body.seenFingerprints : [])],
        nearFingerprints: [sourceIdentity.nearFingerprint, ...(Array.isArray(body.seenNearFingerprints) ? body.seenNearFingerprints : [])]
      });
      chosen = deduped.accepted[0] || null;
    }

    if (!chosen || !response) throw new Error("Could not create a unique related question. Please retry.");
    return NextResponse.json({
      question: { ...chosen, id: crypto.randomUUID(), number: 1 },
      sources: extractSources(response.output),
      model: modelName()
    });
  } catch (error) {
    console.error("Related question generation failed", error);
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
