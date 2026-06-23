import { NextResponse } from "next/server";
import { openAIFromRequest, modelName, safeApiError } from "@/lib/openai-server";
import { expandQuestionBatchPayload, questionBatchSchema } from "@/lib/question-schema";
import { buildQuestionInstructions, buildQuestionPrompt } from "@/lib/prompts";
import { validateQuestionBatch } from "@/lib/question-quality";
import { extractSources } from "@/lib/research-server";
import { openAIConfig, resolveReasoningEffort } from "@/lib/runtime-config";
import { dedupeQuestions } from "@/lib/question-dedup";
import { buildTimingMeta } from "@/lib/exam-timing";
import { buildPromptCacheKey } from "@/lib/prompt-cache-key";

export const runtime = "nodejs";
export const maxDuration = 180;

function uniqueSources(list = []) {
  return [...new Map(list.filter((source) => source?.url).map((source) => [source.url, source])).values()];
}

function retryFeedbackFromError(error) {
  const raw = String(error?.message || "Generation quality check failed.");
  const cleaned = raw.replace(/\s*Regenerate the batch\.\s*$/i, "").replace(/\s+/g, " ").trim();
  if (/sex or pregnancy context/i.test(cleaned)) return "Every stem must explicitly state patient sex or pregnancy context. Rebuild the entire remaining batch with sex-marked or pregnancy-marked clinical scenarios, including PSM items.";
  if (/complete clinical scenario/i.test(cleaned)) return "Every stem must read like a full clinical scenario with age, sex or pregnancy context, complaint, relevant history, and decision-changing findings.";
  if (/duplicate or near-duplicate/i.test(cleaned)) return "The remaining questions were too similar to previous ones. Change patient profile, setting, disease angle, and decision hinge.";
  return cleaned;
}

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
    const config = openAIConfig();
    const useWebSearch = body.useWebSearch === true;
    const seenFingerprints = new Set(Array.isArray(body.seenFingerprints) ? body.seenFingerprints : []);
    const seenNearFingerprints = new Set(Array.isArray(body.seenNearFingerprints) ? body.seenNearFingerprints : []);
    const seenQuestionSignatures = Array.isArray(body.seenQuestionSignatures) ? [...new Set(body.seenQuestionSignatures.filter(Boolean))] : [];
    const timing = buildTimingMeta(count);
    const promptCacheKey = buildPromptCacheKey("generate-v3");
    const accepted = [];
    const sources = [];
    let lastResponseId = null;
    let retryFeedback = "";
    let lastQualityIssue = "";

    for (let attempt = 0; accepted.length < count && attempt < 6; attempt += 1) {
      const remaining = count - accepted.length;
      const response = await openai.responses.create({
        model: modelName(),
        reasoning: { effort: resolveReasoningEffort(body.reasoningEffort, config.generationEffort) },
        ...(useWebSearch ? {
          tools: [{ type: "web_search", search_context_size: config.searchContextSize, user_location: { type: "approximate", country: "IN" } }],
          tool_choice: "auto",
          max_tool_calls: 1,
          include: ["web_search_call.action.sources"]
        } : {
          parallel_tool_calls: false
        }),
        store: false,
        instructions: buildQuestionInstructions(),
        max_output_tokens: Math.min(10000, Math.max(1800, remaining * 700)),
        prompt_cache_key: promptCacheKey,
        input: buildQuestionPrompt({
          ...body,
          count: remaining,
          seenQuestionSignatures: [...seenQuestionSignatures, ...accepted.map((question) => question.signature)],
          retryFeedback,
          liveVerificationMode: useWebSearch
            ? "Live web search is enabled for this request. Verify current or guideline-sensitive details before committing the key."
            : "Live web search is disabled for speed. Use the provided research brief where available, prefer durable NEET-PG-standard concepts, and avoid unstable guideline-sensitive cut-offs or controversial updates."
        }),
        text: { format: { type: "json_schema", name: "neet_pg_question_batch", strict: true, schema: questionBatchSchema(remaining) } }
      });
      lastResponseId = response.id;
      if (response.status === "incomplete") throw new Error("The verified question batch was incomplete. Please retry this batch.");
      try {
        const data = expandQuestionBatchPayload(JSON.parse(response.output_text));
        const verified = validateQuestionBatch(data.questions, remaining);
        const deduped = dedupeQuestions(verified, {
          fingerprints: [...seenFingerprints, ...accepted.map((question) => question.fingerprint)],
          nearFingerprints: [...seenNearFingerprints, ...accepted.map((question) => question.nearFingerprint)]
        });

        if (!deduped.accepted.length) {
          lastQualityIssue = "All proposed questions were duplicates or near-duplicates.";
          retryFeedback = retryFeedbackFromError(new Error(lastQualityIssue));
          continue;
        }
        retryFeedback = deduped.rejected.length ? "Keep the remaining questions more distinct from previous stems, especially patient profile, setting, and decisive hinge." : "";
        for (const question of deduped.accepted) {
          seenFingerprints.add(question.fingerprint);
          seenNearFingerprints.add(question.nearFingerprint);
        }
        accepted.push(...deduped.accepted);
        if (useWebSearch) sources.push(...extractSources(response.output));
      } catch (error) {
        if (error instanceof SyntaxError || error?.status === 422) {
          lastQualityIssue = String(error.message || "Generation quality check failed.");
          retryFeedback = retryFeedbackFromError(error);
          continue;
        }
        throw error;
      }
    }

    if (accepted.length !== count) {
      throw new Error(lastQualityIssue ? `Generation kept failing the quality gate. Last issue: ${lastQualityIssue}` : "Could not produce a fully unique verified batch. Please retry and PulseTest-AI will generate a fresh set.");
    }

    const questions = accepted.slice(0, count).map((question, index) => ({
      ...question,
      id: crypto.randomUUID(),
      number: Number(body.startNumber || 1) + index
    }));
    return NextResponse.json({ meta: timing, questions, sources: uniqueSources(sources), model: modelName(), responseId: lastResponseId });
  } catch (error) {
    console.error("Question generation failed", error);
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
