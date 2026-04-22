import { NextRequest, NextResponse } from "next/server";

import { buildApiUrl } from "@/lib/api";

type ProxyErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
  detail?:
    | {
        code?: string;
        message?: string;
      }
    | string;
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
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const query = new URLSearchParams();
  const rawQ = request.nextUrl.searchParams.get("q");
  const rawLimit = request.nextUrl.searchParams.get("limit");
  const rawReadyOnly = request.nextUrl.searchParams.get("ready_only");

  if (rawQ) {
    query.set("q", rawQ);
  }

  if (rawLimit) {
    query.set("limit", rawLimit);
  }

  if (rawReadyOnly === "1" || rawReadyOnly?.toLowerCase() === "true") {
    query.set("ready_only", "true");
  }

  const upstreamUrl = buildApiUrl(
    `/companies/suggestions${query.toString() ? `?${query.toString()}` : ""}`,
  );

  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "network_error",
          message: "Nao foi possivel conectar a API da V2.",
        },
      },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  if (!upstream.ok) {
    let payload: ProxyErrorPayload | null = null;

    try {
      payload = (await upstream.json()) as ProxyErrorPayload;
    } catch {
      payload = null;
    }

    const fallbackMessage =
      upstream.status >= 500
        ? "A API da V2 nao conseguiu retornar sugestoes agora."
        : "Nao foi possivel buscar sugestoes de empresas agora.";

    return buildProxyErrorResponse(upstream.status, payload, fallbackMessage);
  }

  let payload: unknown;

  try {
    payload = await upstream.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_response",
          message: "A API da V2 retornou um corpo invalido para as sugestoes.",
        },
      },
      {
        status: 502,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(payload, {
    status: upstream.status,
    headers: {
      "cache-control": "no-store",
    },
  });
}
