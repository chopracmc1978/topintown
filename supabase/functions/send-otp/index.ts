import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendOtpRequest {
  email?: string;
  phone?: string;
  type: "email" | "phone";
  customerId?: string;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone, type, customerId }: SendOtpRequest = await req.json();
    console.log("Send OTP request:", { email, phone, type, customerId });

    // Validate input
    if (type === "email" && !email) {
      throw new Error("Email is required for email OTP");
    }
    if (type === "phone" && !phone) {
      throw new Error("Phone is required for phone OTP");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTP codes for this email/phone
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
    });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      throw new Error("Failed to generate OTP");
    }

    // Send OTP via email
    if (type === "email" && email) {
      const { error: emailError } = await resend.emails.send({
        from: "Top In Town <noreply@topintown.ca>",
        to: [email],
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

      if (emailError) {
        console.error("Error sending email:", emailError);
        throw new Error("Failed to send verification email");
      }
      console.log("Email OTP sent successfully to:", email);
    }

    // For phone OTP - we'll just log for now (would need Twilio integration)
    if (type === "phone" && phone) {
      console.log(`Phone OTP ${code} would be sent to ${phone} (SMS not implemented)`);
      // In production, integrate Twilio here
    }

    return new Response(
      JSON.stringify({ success: true, message: `OTP sent to ${type}` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp:", error);
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
