import { NextResponse } from "next/server";
import { performResearch } from "@/lib/research-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const research = await performResearch(request, { requireServerKey: true });
    return NextResponse.json({ ok: true, generatedAt: research.generatedAt });
  } catch (error) {
    console.error("Daily research failed", error);
    return NextResponse.json({ error: "Daily research failed" }, { status: 500 });
  }
}
