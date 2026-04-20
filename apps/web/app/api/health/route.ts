import { NextResponse } from "next/server";

import { safeFetchHealth } from "@/lib/api";

export async function GET() {
  const health = await safeFetchHealth();

  return NextResponse.json(health, {
    status: health ? 200 : 503,
    headers: {
      "cache-control": "no-store",
    },
  });
}
