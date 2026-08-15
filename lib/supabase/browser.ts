import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Safe for the browser: this uses the public anon key, which relies on Row
// Level Security policies for protection, not on being kept secret.
export const supabaseBrowser = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
