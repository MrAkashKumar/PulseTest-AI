import { NextResponse } from "next/server";
import { getLatestResearch, performResearch } from "@/lib/research-server";
import { safeApiError } from "@/lib/openai-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ research: await getLatestResearch() });
}

export async function POST(request) {
  try {
    return NextResponse.json({ research: await performResearch(request) });
  } catch (error) {
    console.error("Research refresh failed", error);
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
