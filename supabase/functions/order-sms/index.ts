import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderSmsRequest {
  orderNumber: string;
  phone: string;
  type: "preparing" | "ready" | "complete";
  prepTime?: number; // in minutes, only for "preparing" type
}

async function sendSmsWithTwilio(to: string, message: string): Promise<void> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error("Twilio credentials are not configured");
  }

  // Format phone number to E.164 format if needed
  let formattedPhone = to;
  if (!to.startsWith("+")) {
    formattedPhone = "+1" + to.replace(/\D/g, "");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const body = new URLSearchParams({
    To: formattedPhone,
    From: twilioPhone,
    Body: message,
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

  try {
    const { orderNumber, phone, type, prepTime }: OrderSmsRequest = await req.json();
    console.log("Order SMS request:", { orderNumber, phone, type, prepTime });

    if (!phone) {
      console.log("No phone number provided, skipping SMS");
      return new Response(
        JSON.stringify({ success: true, message: "No phone number, SMS skipped" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let message = "";

    switch (type) {
      case "preparing":
        message = `Top In Town Pizza: Your order ${orderNumber} is being prepared. Estimated time: ${prepTime || 20} minutes. Thank you for your order!`;
        break;
      case "ready":
        message = `Top In Town Pizza: Great news! Your order ${orderNumber} is READY for pickup. See you soon!`;
        break;
      case "complete":
        message = `Top In Town Pizza: Thank you for choosing us! We hope you enjoyed your order ${orderNumber}. See you again soon! 🍕`;
        break;
      default:
        throw new Error("Invalid SMS type");
    }

    await sendSmsWithTwilio(phone, message);

    return new Response(
      JSON.stringify({ success: true, message: `SMS sent for ${type}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in order-sms:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
