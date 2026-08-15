import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// SERVER-ONLY. This client uses the Supabase service role key, which
// bypasses Row Level Security entirely — it can read and write every row in
// every table. NEVER import this file from a "use client" component or any
// module that ends up in the browser bundle; that would ship the service
// role key to every visitor. Use it only from API routes and other
// server-side code. The `server-only` import above turns an accidental
// client-side import into a build error, on top of this warning.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
