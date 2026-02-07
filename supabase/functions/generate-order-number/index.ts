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
    const { locationId }: GenerateOrderNumberRequest = await req.json();
    console.log("Generate order number request:", { locationId, staffUserId: staffUser.userId });

    // Input validation
    if (!locationId || typeof locationId !== "string" || locationId.length > 50) {
      return json(400, { error: "Valid location ID is required" });
    }

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

    return json(200, { orderNumber });
  } catch (error: any) {
    console.error("Error generating order number:", error);
    return json(400, { error: "Failed to generate order number" });
  }
};

serve(handler);
