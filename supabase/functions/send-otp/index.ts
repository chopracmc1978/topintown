import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_OTP_PER_HOUR = 5;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailWithResend(to: string, code: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: "Top In Town Pizza <noreply@topintownpizza.ca>",
    to: [to],
    subject: "Your Verification Code - Top In Town",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #e53935; text-align: center;">Top In Town Pizza</h1>
        <div style="background-color: #f5f5f5; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="margin-bottom: 20px;">Your Verification Code</h2>
          <div style="font-size: 36px; font-weight: bold; color: #e53935; letter-spacing: 8px; padding: 20px; background: white; border-radius: 8px; display: inline-block;">
            ${code}
          </div>
          <p style="color: #666; margin-top: 20px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Resend API error: ${error.message}`);
  }
}

async function sendSmsWithTwilio(to: string, code: string): Promise<void> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error("Twilio credentials are not configured");
  }

  let formattedPhone = to;
  if (!to.startsWith("+")) {
    formattedPhone = "+1" + to.replace(/\D/g, "");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const body = new URLSearchParams({
    To: formattedPhone,
    From: twilioPhone,
    Body: `Your Top In Town Pizza verification code is: ${code}. This code expires in 10 minutes.`,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Twilio API error:", errorData);
    throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
  }

  const result = await response.json();
  console.log("Twilio SMS sent successfully, SID:", result.sid);
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
    const type = body.type;
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const customerId = typeof body.customerId === "string" ? body.customerId : undefined;

    // Input validation
    if (type !== "email" && type !== "phone") {
      return json(400, { error: "Invalid OTP type" });
    }
    if (type === "email") {
      if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(400, { error: "Valid email is required" });
      }
    }
    if (type === "phone") {
      if (!phone || phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 15) {
        return json(400, { error: "Valid phone number is required" });
      }
    }

    console.log("Send OTP request:", { type, hasEmail: !!email, hasPhone: !!phone });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limiting: check how many OTPs were sent in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let rateLimitQuery = supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("type", type)
      .gt("created_at", oneHourAgo);

    if (type === "email" && email) {
      rateLimitQuery = rateLimitQuery.eq("email", email);
    }
    if (type === "phone" && phone) {
      rateLimitQuery = rateLimitQuery.eq("phone", phone);
    }

    const { count: otpCount } = await rateLimitQuery;
    if (otpCount !== null && otpCount >= MAX_OTP_PER_HOUR) {
      console.log("Rate limit exceeded for:", type === "email" ? email : phone);
      return json(400, { error: "Too many requests. Please wait before requesting another code." });
    }

    // Generate OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate previous OTP codes
    if (type === "email" && email) {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("email", email)
        .eq("type", "email")
        .eq("used", false);
    }
    if (type === "phone" && phone) {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("phone", phone)
        .eq("type", "phone")
        .eq("used", false);
    }

    // Insert new OTP code
    const { error: insertError } = await supabase.from("otp_codes").insert({
      customer_id: customerId || null,
      email: type === "email" ? email : null,
      phone: type === "phone" ? phone : null,
      code,
      type,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return json(400, { error: "Failed to generate OTP" });
    }

    // Send OTP
    if (type === "email" && email) {
      await sendEmailWithResend(email, code);
      console.log("Email OTP sent successfully to:", email);
    }
    if (type === "phone" && phone) {
      await sendSmsWithTwilio(phone, code);
      console.log("Phone OTP sent successfully to:", phone);
    }

    return json(200, { success: true, message: `OTP sent to ${type}` });
  } catch (error: any) {
    console.error("Error in send-otp:", error);
    return json(400, { error: "Failed to send verification code. Please try again." });
  }
};

serve(handler);
