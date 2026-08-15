import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";

type CreateDonationBody = {
  pickup_address?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  categories?: string[];
  size?: string | null;
  photo_url?: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateDonationBody | null;

  // status is always 'draft' here regardless of what the client sends —
  // this route only ever creates the initial row.
  const insert: TablesInsert<"donations"> = {
    status: "draft",
    pickup_address: body?.pickup_address ?? null,
    pickup_lat: body?.pickup_lat ?? null,
    pickup_lng: body?.pickup_lng ?? null,
    categories: Array.isArray(body?.categories) ? body.categories : [],
    size: body?.size ?? null,
    photo_url: body?.photo_url ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("donations")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
