import { NextResponse } from "next/server";
import { runtimeHealthSnapshot } from "@/lib/runtime-config";

export async function GET() {
  return NextResponse.json(runtimeHealthSnapshot());
}
