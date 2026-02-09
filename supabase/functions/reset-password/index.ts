import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compareSync, hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter for brute-force protection
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

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
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const otpCode = typeof body.otpCode === "string" ? body.otpCode : "";

    // Input validation
    if (!email || !newPassword) {
      return json(400, { error: "Email and new password are required" });
    }
    if (!otpCode) {
      return json(400, { error: "OTP verification code is required" });
    }
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: "Invalid email format" });
    }
    if (newPassword.length < 6) {
      return json(400, { error: "Password must be at least 6 characters" });
    }
    if (newPassword.length > 128) {
      return json(400, { error: "Password must be less than 128 characters" });
    }
    if (!/^\d{6}$/.test(otpCode)) {
      return json(400, { error: "Invalid OTP code format" });
    }

    // Rate limiting by email+IP to prevent brute-force attacks
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `reset:${email}:${clientIp}`;
    if (isRateLimited(rateLimitKey)) {
      console.warn("Rate limited reset-password attempt for:", email);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, "Retry-After": "900" } }
      );
    }

    console.log("Password reset request for:", email);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify OTP server-side before allowing password reset
    const now = new Date().toISOString();
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("id, code, expires_at, used, attempts")
      .eq("email", email)
      .eq("type", "email")
      .eq("used", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("Error fetching OTP:", otpError);
      return json(400, { error: "Password reset failed" });
    }

    if (!otpRecord) {
      console.log("No valid OTP found for:", email);
      return json(400, { error: "Invalid or expired verification code. Please request a new one." });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      // Mark as used (exhausted)
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);
      return json(400, { error: "Too many attempts. Please request a new verification code." });
    }

    // Increment attempts
    await supabase
      .from("otp_codes")
      .update({ attempts: (otpRecord.attempts || 0) + 1 })
      .eq("id", otpRecord.id);

    // Verify OTP code
    if (otpRecord.code !== otpCode) {
      console.log("OTP mismatch for:", email);
      return json(400, { error: "Invalid verification code" });
    }

    // Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email")
      .eq("email", email)
      .single();

    if (customerError || !customer) {
      console.log("Customer not found:", email);
      // Generic error to prevent user enumeration
      return json(400, { error: "Password reset failed" });
    }

    // Hash with bcrypt
    const hashedPassword = hashSync(newPassword);

    const { error: updateError } = await supabase
      .from("customers")
      .update({ password_hash: hashedPassword })
      .eq("id", customer.id);

    if (updateError) {
      console.error("Error updating password:", updateError);
      return json(400, { error: "Failed to update password" });
    }

    console.log("Password reset successful for:", email);

    return json(200, { success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Error in reset-password:", error);
    return json(400, { error: "Password reset failed. Please try again." });
  }
};

serve(handler);
