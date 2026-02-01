import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateOrderNumberRequest {
  locationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationId }: GenerateOrderNumberRequest = await req.json();
    console.log("Generate order number request:", { locationId });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use the atomic DB function for sequential, DST-safe order numbers
    const { data, error } = await supabase.rpc("next_order_number", {
      p_location_id: locationId ?? "calgary",
    });

    if (error) {
      console.error("Error from next_order_number:", error);
      throw error;
    }

    const orderNumber = data as string;
    console.log("Generated order number:", orderNumber);

    return new Response(
      JSON.stringify({ orderNumber }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error generating order number:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
