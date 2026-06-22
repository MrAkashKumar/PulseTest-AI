import { NextResponse } from "next/server";
import { openAIFromRequest, modelName, safeApiError } from "@/lib/openai-server";
import { questionBatchSchema } from "@/lib/question-schema";
import { buildQuestionPrompt } from "@/lib/prompts";
import { validateQuestionBatch } from "@/lib/question-quality";
import { extractSources } from "@/lib/research-server";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request) {
  try {
    const body = await request.json();
    const count = Number(body.count);
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return NextResponse.json({ error: "Each generation batch must contain 1–10 questions." }, { status: 400 });
    }
    if (!Array.isArray(body.subjects) || !body.subjects.length) {
      return NextResponse.json({ error: "A subject allocation is required." }, { status: 400 });
    }
    const openai = openAIFromRequest(request);
    const response = await openai.responses.create({
      model: modelName(),
      reasoning: { effort: body.reasoningEffort === "high" ? "high" : "medium" },
      tools: [{ type: "web_search", search_context_size: "medium", user_location: { type: "approximate", country: "IN" } }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      input: buildQuestionPrompt({ ...body, count }),
      text: { format: { type: "json_schema", name: "neet_pg_question_batch", strict: true, schema: questionBatchSchema(count) } }
    });
    if (response.status === "incomplete") throw new Error("The verified question batch was incomplete. Please retry this batch.");
    const data = JSON.parse(response.output_text);
    const verified = validateQuestionBatch(data.questions, count);
    const questions = verified.map((question, index) => ({
      ...question,
      id: crypto.randomUUID(),
      number: Number(body.startNumber || 1) + index
    }));
    return NextResponse.json({ questions, sources: extractSources(response.output), model: modelName(), responseId: response.id });
  } catch (error) {
    console.error("Question generation failed", error);
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
