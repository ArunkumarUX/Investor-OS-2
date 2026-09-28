import { NextRequest, NextResponse } from "next/server";
// Cross-site request protection for the local workspace; not a substitute for account authorization.
export async function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== request.nextUrl.origin)
  )
    return NextResponse.json(
      { error: "Cross-site API requests are not allowed." },
      { status: 403 },
    );
  const videoUpload = request.nextUrl.pathname === "/api/evidence-video";
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !videoUpload &&
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return NextResponse.json(
      { error: "Send application/json." },
      { status: 415 },
    );
  if (Number(request.headers.get("content-length")) > 100000)
    return NextResponse.json(
      { error: "Request exceeds 100 KB." },
      { status: 413 },
    );
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.body) {
    const reader = request.clone().body!.getReader();
    let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 100000) {
          void reader.cancel().catch(() => {});
          return NextResponse.json({ error: "Request exceeds 100 KB." }, { status: 413 });
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export const config = { matcher: "/api/:path*" };
