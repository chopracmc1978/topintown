import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Safe fields that can be returned to clients (never includes password_hash)
const SAFE_COLUMNS = "id, email, phone, full_name, email_verified, phone_verified";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    const { email, customerId } = await req.json();

    if (!email && !customerId) {
      return json(400, { error: "email or customerId is required" });
    }

    // Input validation
    if (email && (typeof email !== "string" || email.length > 254)) {
      return json(400, { error: "Invalid email" });
    }
    if (customerId && typeof customerId !== "string") {
      return json(400, { error: "Invalid customerId" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let customers = null;

    if (email) {
      // Look up by email - used during checkout to check if account exists
      const { data, error } = await supabase
        .from("customers")
        .select(SAFE_COLUMNS)
        .eq("email", email.toLowerCase().trim());

      if (error) {
        console.error("Error looking up customer by email:", error);
        return json(500, { error: "Failed to look up customer" });
      }
      customers = data;
    } else if (customerId) {
      // Look up by ID - used for profile refresh
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(customerId)) {
        return json(400, { error: "Invalid customerId format" });
      }

      const { data, error } = await supabase
        .from("customers")
        .select(SAFE_COLUMNS)
        .eq("id", customerId)
        .single();

      if (error) {
        console.error("Error looking up customer by id:", error);
        return json(200, { customer: null });
      }
      return json(200, { customer: data });
    }

    return json(200, { customers: customers || [] });
  } catch (error) {
    console.error("customer-profile error:", error);
    return json(500, { error: "Internal server error" });
  }
});
