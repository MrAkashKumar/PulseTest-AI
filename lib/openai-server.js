import OpenAI from "openai";

export function openAIFromRequest(request, { requireServerKey = false } = {}) {
  const provided = requireServerKey ? "" : request?.headers?.get("x-openai-key")?.trim();
  const apiKey = provided || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("Add an OpenAI API key in Settings, or configure OPENAI_API_KEY on the server.");
    error.status = 401;
    throw error;
  }
  return new OpenAI({ apiKey });
}

export function modelName() {
  return process.env.OPENAI_MODEL || "gpt-5.5";
}

export function safeApiError(error) {
  const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
  if (status === 401) return { status, message: "The OpenAI key was rejected. Check it in Settings and try again." };
  if (status === 429) return { status, message: "The API rate limit was reached. Wait briefly, then resume generation." };
  if (status >= 400 && status < 500) return { status, message: error?.message || "The generation request was not accepted." };
  return { status: 500, message: "Generation failed unexpectedly. Your completed batches are still saved in this session." };
}
