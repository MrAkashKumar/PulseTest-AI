import { NextResponse } from "next/server";
import { openAIFromRequest, modelName, safeApiError } from "@/lib/openai-server";
import { questionBatchSchema } from "@/lib/question-schema";
import { buildRelatedQuestionPrompt } from "@/lib/prompts";
import { extractSources } from "@/lib/research-server";

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
    const response = await openai.responses.create({
      model: modelName(),
      reasoning: { effort: "high" },
      tools: [{
        type: "web_search",
        search_context_size: "high",
        user_location: { type: "approximate", country: "IN" },
        filters: { allowed_domains: AUTHORITATIVE_DOMAINS }
      }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      input: buildRelatedQuestionPrompt(body),
      text: { format: { type: "json_schema", name: "related_neet_pg_question", strict: true, schema: questionBatchSchema(1) } }
    });
    if (response.status === "incomplete") throw new Error("The related question response was incomplete. Please retry.");
    const question = JSON.parse(response.output_text).questions[0];
    return NextResponse.json({
      question: { ...question, id: crypto.randomUUID(), number: 1 },
      sources: extractSources(response.output),
      model: modelName()
    });
  } catch (error) {
    console.error("Related question generation failed", error);
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
