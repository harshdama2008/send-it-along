import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(_request: Request, ctx: RouteContext<"/api/donations/[id]">) {
  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin.from("donations").select("*").eq("id", id).maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
