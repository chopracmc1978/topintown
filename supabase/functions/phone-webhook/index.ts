import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Cisco phones send GET requests with query params via Action URL
    let phone = url.searchParams.get("phone") || "";
    let name = url.searchParams.get("name") || "";
    let location = url.searchParams.get("location") || "calgary";

    // Also support POST body for flexibility
    if (req.method === "POST") {
      try {
        const body = await req.json();
        phone = body.phone || phone;
        name = body.name || name;
        location = body.location || location;
      } catch {
        // Ignore parse errors, use query params
      }
    }

    // Clean phone number - remove non-digits, strip leading 1 for North American numbers
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) {
      cleanPhone = cleanPhone.substring(1);
    }

    if (!cleanPhone || cleanPhone.length < 7) {
      return new Response(
        JSON.stringify({ error: "Valid phone number required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean caller name (Cisco often sends "UNKNOWN" or encoded values)
    let callerName = decodeURIComponent(name).trim();
    if (
      !callerName ||
      callerName.toUpperCase() === "UNKNOWN" ||
      callerName.toUpperCase() === "UNAVAILABLE" ||
      callerName.toUpperCase() === "ANONYMOUS"
    ) {
      callerName = "";
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up customer name from DB if not provided by phone
    if (!callerName) {
      const { data: customer } = await supabase
        .from("customers")
        .select("full_name")
        .eq("phone", cleanPhone)
        .single();

      if (customer?.full_name) {
        callerName = customer.full_name;
      }
    }

    // Insert incoming call record
    const { error } = await supabase.from("incoming_calls").insert({
      caller_phone: cleanPhone,
      caller_name: callerName || null,
      location_id: location,
      handled: false,
    });

    if (error) {
      console.error("Error inserting incoming call:", error);
      return new Response(
        JSON.stringify({ error: "Failed to record call" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Incoming call recorded: ${cleanPhone} (${callerName || "Unknown"}) at ${location}`);

    return new Response(
      JSON.stringify({ success: true, phone: cleanPhone, name: callerName }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("phone-webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
