import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogg",
  "video/quicktime": "mov",
};

const MAX_BYTES = 80 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const gate = authorize(req, ["/deal", "/diligence"]);
  if ("error" in gate) return gate.error;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a video file." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use an MP4, WebM, MOV, or OGG video." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Video must be under 80 MB." }, { status: 400 });
  }
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "videos");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/videos/${name}`, name: file.name });
}
