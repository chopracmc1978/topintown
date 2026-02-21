import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderSmsRequest {
  orderNumber: string;
  phone?: string;
  customerId?: string;
  type: "accepted" | "preparing" | "ready" | "complete" | "cancelled";
  prepTime?: number;
  pickupTime?: string;
}

async function verifyStaffAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (error || !claims?.claims?.sub) return null;

  const userId = claims.claims.sub as string;

  // Check user has staff or admin role
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "staff"])
    .limit(1);

  if (!roleData || roleData.length === 0) return null;

  return { userId };
}

async function sendSmsWithTwilio(to: string, message: string): Promise<void> {
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

  console.log(`Sending SMS to ${formattedPhone}`);

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

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  // Verify staff authentication
  const staffUser = await verifyStaffAuth(req);
  if (!staffUser) {
    return json(401, { error: "Staff authentication required" });
  }

  try {
    const { orderNumber, phone, customerId, type, prepTime, pickupTime, locationId }: OrderSmsRequest & { locationId?: string } = await req.json();
    console.log("Order SMS request:", { orderNumber, phone, customerId, type, prepTime, pickupTime, locationId, staffUserId: staffUser.userId });

    // Input validation
    if (!orderNumber || typeof orderNumber !== "string") {
      return json(400, { error: "Order number is required" });
    }
    const validTypes = ["accepted", "preparing", "ready", "complete", "cancelled"];
    if (!validTypes.includes(type)) {
      return json(400, { error: "Invalid SMS type" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to find customer
    let customer: { id: string; phone: string; phone_verified: boolean } | null = null;

    if (customerId) {
      const { data, error } = await supabase
        .from("customers")
        .select("id, phone, phone_verified")
        .eq("id", customerId)
        .maybeSingle();
      
      if (error) {
        console.error("Error looking up customer by ID:", error);
      } else {
        customer = data;
      }
    }

    if (!customer && phone) {
      const normalizedPhone = phone.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("customers")
        .select("id, phone, phone_verified")
        .eq("phone", normalizedPhone)
        .maybeSingle();
      
      if (error) {
        console.error("Error looking up customer by phone:", error);
      } else {
        customer = data;
      }
    }

    if (!customer) {
      console.log("No customer found, skipping SMS");
      return json(200, { success: true, message: "Customer not found, SMS skipped" });
    }

    // Phone verified check removed - paid Twilio account can send to any number

    if (!customer.phone) {
      console.log("Customer has no phone, skipping SMS");
      return json(200, { success: true, message: "No phone number, SMS skipped" });
    }

    let message = "";

    // Resolve location details for accepted/ready/preparing messages
    let locationName = "";
    let locationAddress = "";
    let locationPhone = "";
    if (locationId) {
      if (locationId === "calgary" || locationId.toLowerCase().includes("calgary")) {
        locationName = "Calgary";
        locationAddress = "3250 - 60 Street North East, Calgary";
        locationPhone = "(403) 280-7373 ext 1";
      } else if (locationId === "chestermere" || locationId.toLowerCase().includes("kinni")) {
        locationName = "Kinniburgh";
        locationAddress = "272 Kinniburgh Blvd, Chestermere";
        locationPhone = "(403) 280-7373 ext 2";
      } else {
        // Try DB lookup
        const { data: locData } = await supabase
          .from("locations")
          .select("short_name, address, city, phone")
          .eq("id", locationId)
          .maybeSingle();
        if (locData) {
          locationName = locData.short_name || "";
          locationAddress = `${locData.address}${locData.city ? ', ' + locData.city : ''}`;
          locationPhone = locData.phone || "";
        }
      }
    }

    const formatPickupTime = (isoString: string): string => {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      }) + ' at ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
    };

    const locationInfo = locationName 
      ? `\n📍 ${locationName} Location\n${locationAddress}\n📞 ${locationPhone}` 
      : "";

    switch (type) {
      case "accepted":
        if (pickupTime) {
          message = `Top In Town Pizza: Your order ${orderNumber} has been accepted! Scheduled pickup: ${formatPickupTime(pickupTime)}.${locationInfo}\nThank you!`;
        } else {
          message = `Top In Town Pizza: Your order ${orderNumber} has been accepted and is being prepared.${locationInfo}\nThank you!`;
        }
        break;
      case "preparing":
        message = `Top In Town Pizza: Your order ${orderNumber} is being prepared. Estimated time: ${prepTime || 20} minutes.${locationInfo}\nThank you for your order!`;
        break;
      case "ready":
        message = `Top In Town Pizza: Great news! Your order ${orderNumber} is READY for pickup!${locationInfo}\nSee you soon!`;
        break;
      case "complete":
        message = `Top In Town Pizza: Thank you for choosing us! We hope you enjoyed your order ${orderNumber}. See you again soon! 🍕`;
        break;
      case "cancelled":
        message = `Top In Town Pizza: Your order ${orderNumber} has been cancelled. If you have any questions, please contact us. We hope to serve you again soon!`;
        break;
      default:
        return json(400, { error: "Invalid SMS type" });
    }

    await sendSmsWithTwilio(customer.phone, message);

    return json(200, { success: true, message: `SMS sent for ${type}` });
  } catch (error: any) {
    console.error("Error in order-sms:", error);
    return json(400, { error: "Failed to send SMS" });
  }
};

serve(handler);
