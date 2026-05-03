import { NextResponse } from "next/server";

import { buildApiUrl } from "@/lib/api";

type ProxyErrorPayload = {
  error?: { code?: string; message?: string };
  detail?: { code?: string; message?: string } | string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildProxyErrorResponse(
  status: number,
  payload: ProxyErrorPayload | null,
  fallbackMessage: string,
) {
  const detailCode =
    isRecord(payload?.detail) && typeof payload.detail.code === "string"
      ? payload.detail.code
      : undefined;
  const detailMessage =
    isRecord(payload?.detail) && typeof payload.detail.message === "string"
      ? payload.detail.message
      : typeof payload?.detail === "string"
        ? payload.detail
        : undefined;
  const code = payload?.error?.code ?? detailCode ?? "unknown_error";
  const message = payload?.error?.message ?? detailMessage ?? fallbackMessage;

  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let upstream: Response;
  try {
    upstream = await fetch(buildApiUrl("/refresh/batch"), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "network_error", message: "Nao foi possivel conectar a API." } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  if (!upstream.ok) {
    let payload: ProxyErrorPayload | null = null;
    try {
      payload = (await upstream.json()) as ProxyErrorPayload;
    } catch {
      payload = null;
    }
    const fallback =
      upstream.status === 429
        ? "Ja existe um batch refresh em andamento."
        : upstream.status >= 500
          ? "A API nao conseguiu iniciar o batch refresh."
          : "Nao foi possivel solicitar o batch refresh.";
    return buildProxyErrorResponse(upstream.status, payload, fallback);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_response", message: "A API retornou um corpo invalido." } },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(payload, {
    status: upstream.status,
    headers: { "cache-control": "no-store" },
  });
}
