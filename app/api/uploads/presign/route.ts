import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Photos are uploaded here: Supabase Storage → this bucket. Create it once
// in the Supabase dashboard (Storage → New bucket → "donation-photos",
// public) before this route can be used.
const PHOTOS_BUCKET = "donation-photos";

type PresignBody = {
  fileName?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PresignBody | null;
  const fileName = body?.fileName ?? "photo.jpg";
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const path = `${randomUUID()}.${extension}`;

  const { data, error } = await supabaseAdmin.storage
    .from(PHOTOS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create an upload URL" },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(PHOTOS_BUCKET).getPublicUrl(path);

  return NextResponse.json({
    path: data.path,
    token: data.token,
    bucket: PHOTOS_BUCKET,
    publicUrl: publicUrlData.publicUrl,
  });
}
