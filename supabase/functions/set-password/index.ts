import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    const body = await req.json();
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Input validation
    if (!customerId || !password) {
      return json(400, { error: "Customer ID and password are required" });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return json(400, { error: "Invalid customer ID format" });
    }
    if (password.length < 6) {
      return json(400, { error: "Password must be at least 6 characters" });
    }
    if (password.length > 128) {
      return json(400, { error: "Password must be less than 128 characters" });
    }

    console.log("Set password request for customer:", customerId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return json(400, { error: "Customer not found" });
    }

    // Hash with bcrypt
    const hashedPassword = await bcrypt.hash(password);

    const { error: updateError } = await supabase
      .from("customers")
      .update({ 
        password_hash: hashedPassword,
        email_verified: true,
        phone_verified: true,
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("Error setting password:", updateError);
      return json(400, { error: "Failed to set password" });
    }

    console.log("Password set successfully for customer:", customerId);

    return json(200, { success: true, message: "Password set successfully" });
  } catch (error: any) {
    console.error("Error in set-password:", error);
    return json(400, { error: "Failed to set password. Please try again." });
  }
};

serve(handler);
