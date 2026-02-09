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
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const otpCode = typeof body.otpCode === "string" ? body.otpCode.trim() : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";

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

    // Must provide either OTP code or current password for verification
    if (!otpCode && !currentPassword) {
      return json(400, { error: "Verification required: provide OTP code or current password" });
    }

    // Rate limiting by customerId+IP to prevent brute-force attacks
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `setpwd:${customerId}:${clientIp}`;
    if (isRateLimited(rateLimitKey)) {
      console.warn("Rate limited set-password attempt for:", customerId);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, "Retry-After": "900" } }
      );
    }

    console.log("Set password request for customer:", customerId, "mode:", otpCode ? "otp" : "password");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify customer exists and get current data
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email, phone, password_hash")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      console.error("Customer lookup failed:", customerId, customerError?.message);
      return json(400, { error: "Unable to process request" });
    }

    // Verify authorization based on mode
    if (otpCode) {
      // OTP mode: verify that an OTP with this code was recently verified for this customer
      // The OTP was already verified by verify-otp (marked as used=true)
      // We check it was used within the last 10 minutes as proof of recent verification
      if (!/^\d{6}$/.test(otpCode)) {
        return json(400, { error: "Invalid OTP code format" });
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      // Look for a recently-verified OTP matching the code for this customer's email or phone
      const { data: otpRecords, error: otpError } = await supabase
        .from("otp_codes")
        .select("id")
        .eq("code", otpCode)
        .eq("used", true)
        .gt("created_at", tenMinutesAgo)
        .or(`email.eq.${customer.email},phone.eq.${customer.phone}`)
        .limit(1);

      if (otpError) {
        console.error("Error checking OTP verification:", otpError);
        return json(400, { error: "Verification failed" });
      }

      if (!otpRecords || otpRecords.length === 0) {
        console.log("No recently verified OTP found for customer:", customerId);
        return json(400, { error: "Verification expired. Please verify your identity again." });
      }

    } else if (currentPassword) {
      // Current password mode: verify the existing password (for password changes)
      if (!customer.password_hash) {
        console.error("No existing password for customer:", customerId);
        return json(400, { error: "Verification required. Please use OTP verification." });
      }

      if (currentPassword.length > 128) {
        return json(400, { error: "Invalid credentials" });
      }

      const isBcryptHash = customer.password_hash.startsWith("$2");
      let passwordValid = false;

      if (isBcryptHash) {
        passwordValid = compareSync(currentPassword, customer.password_hash);
      } else {
        // Legacy SHA-256 comparison
        const encoder = new TextEncoder();
        const data = encoder.encode(currentPassword);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha256Result = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        passwordValid = sha256Result === customer.password_hash;
      }

      if (!passwordValid) {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
        return json(400, { error: "Verification failed" });
      }
    }

    // Hash with bcrypt
    const hashedPassword = hashSync(password);

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
