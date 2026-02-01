import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateOrderNumberRequest {
  locationId: string;
}

// Location code mapping
const LOCATION_CODES: Record<string, string> = {
  "calgary": "CAL",
  "chestermere": "KIN", // Kinniburgh
};

// Month abbreviations
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

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

    // Get location code
    const locationCode = LOCATION_CODES[locationId?.toLowerCase()] || "CAL";
    
    // Get current date components
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits: "26"
    const month = MONTHS[now.getMonth()]; // "JAN", "FEB", etc.
    const day = now.getDate().toString().padStart(2, "0"); // "01", "31", etc.
    
    // Build the date prefix for today: e.g., "TIT-CAL-26JAN31"
    const datePrefix = `TIT-${locationCode}-${year}${month}${day}`;
    
    // Count existing orders for this location today
    // Get start and end of today in UTC
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const { count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("location_id", locationId?.toLowerCase() || "calgary")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString());

    if (error) {
      console.error("Error counting orders:", error);
      throw error;
    }

    // Sequence starts at 101
    const sequence = 101 + (count || 0);
    
    // Final order number: TIT-CAL-26JAN31101
    const orderNumber = `${datePrefix}${sequence}`;
    
    console.log("Generated order number:", orderNumber, "Count:", count);

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
