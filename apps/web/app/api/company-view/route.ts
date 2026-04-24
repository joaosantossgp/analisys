import { NextRequest, NextResponse } from "next/server";

import { buildApiUrl } from "@/lib/api";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Corpo da requisicao invalido." } },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const upstreamUrl = buildApiUrl("/analytics/company-view");

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
    }

    // Pass through any error from the backend
    return new NextResponse(null, {
      status: upstream.ok ? 204 : upstream.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    // Analytics errors must be silent — return 204 to client regardless
    return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
}
