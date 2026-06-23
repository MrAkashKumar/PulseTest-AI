import { NextResponse } from "next/server";
import { openAIFromRequest, modelName, safeApiError } from "@/lib/openai-server";
import { buildTutorInstructions } from "@/lib/prompts";
import { extractSources } from "@/lib/research-server";
import { buildPromptCacheKey } from "@/lib/prompt-cache-key";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request) {
  try {
    const body = await request.json();
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "A tutor question is required." }, { status: 400 });
    }

    const openai = openAIFromRequest(request);
    const useWorldSearch = body.useWorldSearch === true;
    const response = await openai.responses.create({
      model: modelName(),
      instructions: buildTutorInstructions(),
      input: [{ role: "user", content: message }],
      previous_response_id: body.previousResponseId || undefined,
      prompt_cache_key: buildPromptCacheKey(useWorldSearch ? "tutor-world-v1" : "tutor-local-v1"),
      max_output_tokens: 900,
      reasoning: { effort: useWorldSearch ? "medium" : "low" },
      store: true,
      ...(useWorldSearch ? {
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "auto",
        max_tool_calls: 1,
        include: ["web_search_call.action.sources"]
      } : {
        parallel_tool_calls: false
      })
    });

    if (response.status === "incomplete") {
      throw new Error("The tutor reply was incomplete. Please retry.");
    }

    return NextResponse.json({
      answer: response.output_text,
      responseId: response.id,
      sources: useWorldSearch ? extractSources(response.output) : [],
      model: modelName()
    });
  } catch (error) {
    console.error("Tutor chat failed", error);
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
