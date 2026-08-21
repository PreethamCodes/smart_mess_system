import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase Admin Client.
 * Uses SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
 * NEVER import or invoke this in client-side components.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client cannot be initialized in client-side code.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in server environment.");
  }

  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
