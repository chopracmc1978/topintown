import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Verify a signed session token (HMAC-SHA256) and extract the customerId
async function verifySessionToken(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, sigB64] = parts;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(payloadB64));
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));

    // Check expiry
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    const { customerId, sessionToken } = await req.json();

    if (!customerId || typeof customerId !== "string") {
      return json(400, { error: "customerId is required" });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(customerId)) {
      return json(400, { error: "Invalid customerId format" });
    }

    // --- Authorization: verify session token matches the requested customerId ---
    if (!sessionToken || typeof sessionToken !== "string") {
      console.warn("get-customer-orders: missing sessionToken");
      return json(401, { error: "Unauthorized" });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tokenCustomerId = await verifySessionToken(sessionToken, serviceRoleKey);

    if (!tokenCustomerId) {
      console.warn("get-customer-orders: invalid or expired session token");
      return json(401, { error: "Session expired. Please log in again." });
    }

    if (tokenCustomerId !== customerId) {
      console.warn("get-customer-orders: token customerId mismatch", {
        tokenCustomerId,
        requestedCustomerId: customerId,
      });
      return json(403, { error: "Unauthorized" });
    }

    // --- Authorized: proceed with query ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    // Fetch orders for this customer (excluding cancelled)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, location_id, status, order_type, subtotal, tax, total, notes, created_at, pickup_time, customer_name, customer_phone, payment_status, payment_method, discount, coupon_code, rewards_used, rewards_discount")
      .eq("customer_id", customerId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return json(500, { error: "Failed to fetch orders" });
    }

    if (!orders || orders.length === 0) {
      return json(200, { orders: [] });
    }

    // Fetch order items for all orders
    const orderIds = orders.map((o) => o.id);
    const { data: allItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, order_id, name, quantity, unit_price, total_price, customizations")
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
      return json(500, { error: "Failed to fetch order items" });
    }

    // Group items by order_id
    const itemsByOrder = new Map<string, any[]>();
    for (const item of allItems || []) {
      const existing = itemsByOrder.get(item.order_id) || [];
      existing.push(item);
      itemsByOrder.set(item.order_id, existing);
    }

    // Combine orders with their items
    const result = orders.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
    }));

    return json(200, { orders: result });
  } catch (error) {
    console.error("get-customer-orders error:", error);
    return json(500, { error: "Internal server error" });
  }
});
