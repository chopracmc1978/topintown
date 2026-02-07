import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 5;

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
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const type = body.type;

    // Input validation
    if (!code || !/^\d{6}$/.test(code)) {
      return json(400, { error: "Invalid verification code format" });
    }
    if (type !== "email" && type !== "phone") {
      return json(400, { error: "Invalid verification type" });
    }
    if (type === "email" && (!email || email.length > 255)) {
      return json(400, { error: "Valid email is required for email verification" });
    }
    if (type === "phone" && (!phone || phone.length > 20)) {
      return json(400, { error: "Valid phone is required for phone verification" });
    }

    console.log("Verify OTP request:", { email, phone, type, code: "***" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the OTP code
    let query = supabase
      .from("otp_codes")
      .select("id, customer_id, attempts")
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
      return json(400, { error: "Failed to verify OTP" });
    }

    // If no matching OTP found, check if there's an active OTP for this identifier
    // and increment its attempt counter
    if (!otpRecords || otpRecords.length === 0) {
      // Find the most recent active OTP for this identifier to track attempts
      let attemptQuery = supabase
        .from("otp_codes")
        .select("id, attempts")
        .eq("type", type)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (type === "email" && email) {
        attemptQuery = attemptQuery.eq("email", email);
      }
      if (type === "phone" && phone) {
        attemptQuery = attemptQuery.eq("phone", phone);
      }

      const { data: activeOtp } = await attemptQuery;
      if (activeOtp && activeOtp.length > 0) {
        const newAttempts = (activeOtp[0].attempts || 0) + 1;
        await supabase
          .from("otp_codes")
          .update({ attempts: newAttempts })
          .eq("id", activeOtp[0].id);

        if (newAttempts >= MAX_ATTEMPTS) {
          // Invalidate the OTP after too many attempts
          await supabase
            .from("otp_codes")
            .update({ used: true })
            .eq("id", activeOtp[0].id);
          return json(400, { error: "Too many failed attempts. Please request a new code." });
        }
      }

      return json(400, { error: "Invalid or expired verification code" });
    }

    const otpRecord = otpRecords[0];

    // Check attempt limit
    if ((otpRecord.attempts || 0) >= MAX_ATTEMPTS) {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);
      return json(400, { error: "Too many failed attempts. Please request a new code." });
    }

    // Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // If customer exists, update their verification status
    if (otpRecord.customer_id) {
      const updateField = type === "email" ? "email_verified" : "phone_verified";
      await supabase
        .from("customers")
        .update({ [updateField]: true })
        .eq("id", otpRecord.customer_id);
    }

    console.log("OTP verified successfully for:", type === "email" ? email : phone);

    return json(200, {
      success: true,
      message: `${type} verified successfully`,
      customerId: otpRecord.customer_id,
    });
  } catch (error: any) {
    console.error("Error in verify-otp:", error);
    return json(400, { error: "Verification failed. Please try again." });
  }
};

serve(handler);
