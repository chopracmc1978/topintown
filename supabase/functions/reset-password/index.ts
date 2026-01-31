import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword }: ResetPasswordRequest = await req.json();
    console.log("Password reset request for:", email);

    if (!email || !newPassword) {
      throw new Error("Email and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (customerError || !customer) {
      console.log("Customer not found:", email);
      throw new Error("Customer not found");
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the customer's password
    const { error: updateError } = await supabase
      .from("customers")
      .update({ password_hash: hashedPassword })
      .eq("id", customer.id);

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to update password");
    }

    console.log("Password reset successful for:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in reset-password:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
