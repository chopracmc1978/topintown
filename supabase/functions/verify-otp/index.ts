import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyOtpRequest {
  email?: string;
  phone?: string;
  code: string;
  type: "email" | "phone";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone, code, type }: VerifyOtpRequest = await req.json();
    console.log("Verify OTP request:", { email, phone, type, code: "***" });

    // Validate input
    if (!code) {
      throw new Error("OTP code is required");
    }
    if (type === "email" && !email) {
      throw new Error("Email is required for email verification");
    }
    if (type === "phone" && !phone) {
      throw new Error("Phone is required for phone verification");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the OTP code
    let query = supabase
      .from("otp_codes")
      .select("*")
      .eq("code", code)
      .eq("type", type)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (type === "email" && email) {
      query = query.eq("email", email);
    }
    if (type === "phone" && phone) {
      query = query.eq("phone", phone);
    }

    const { data: otpRecords, error: queryError } = await query;

    if (queryError) {
      console.error("Error querying OTP:", queryError);
      throw new Error("Failed to verify OTP");
    }

    if (!otpRecords || otpRecords.length === 0) {
      throw new Error("Invalid or expired verification code");
    }

    const otpRecord = otpRecords[0];

    // Mark OTP as used
    const { error: updateOtpError } = await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    if (updateOtpError) {
      console.error("Error marking OTP as used:", updateOtpError);
    }

    // If customer exists, update their verification status
    if (otpRecord.customer_id) {
      const updateField = type === "email" ? "email_verified" : "phone_verified";
      const { error: updateCustomerError } = await supabase
        .from("customers")
        .update({ [updateField]: true })
        .eq("id", otpRecord.customer_id);

      if (updateCustomerError) {
        console.error("Error updating customer verification:", updateCustomerError);
      }
    }

    console.log("OTP verified successfully for:", type === "email" ? email : phone);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${type} verified successfully`,
        customerId: otpRecord.customer_id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-otp:", error);
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
