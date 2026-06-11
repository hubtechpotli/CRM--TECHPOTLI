import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getApiOrigin(): string {
  return (process.env.API_PROXY_TARGET || "").replace(/\/$/, "").replace(/\/api$/, "");
}

const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "te", "upgrade"]);

function ensureForwardedFor(req: NextRequest, headers: Headers) {
  const existing =
    headers.get("x-forwarded-for") ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-vercel-forwarded-for");
  if (existing) {
    headers.set("X-Forwarded-For", existing);
    return;
  }
  const clientIp =
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-vercel-forwarded-for") ||
    "127.0.0.1";
  headers.set("X-Forwarded-For", clientIp);
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  const origin = getApiOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        statusCode: 503,
        message:
          "API proxy is not configured. Set API_PROXY_TARGET on Vercel to your Railway API URL.",
      },
      { status: 503 },
    );
  }

  const target = `${origin}/api/${pathSegments.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || HOP_BY_HOP.has(lower)) return;
    headers.set(key, value);
  });
  ensureForwardedFor(req, headers);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    responseHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
