import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { orderNumber, orderId } = await req.json();

    if (!orderNumber && !orderId) {
      return json(400, { error: "orderNumber or orderId is required" });
    }

    // Basic input validation
    if (orderNumber && (typeof orderNumber !== "string" || orderNumber.length > 50)) {
      return json(400, { error: "Invalid orderNumber" });
    }
    if (orderId && typeof orderId !== "string") {
      return json(400, { error: "Invalid orderId" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let orderData = null;

    // Try by order_number first, then by id
    if (orderNumber) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, location_id, status, order_type, subtotal, tax, total, notes, created_at, pickup_time, customer_name, customer_phone, payment_status, payment_method, discount, coupon_code, rewards_used, rewards_discount, amount_paid, source")
        .eq("order_number", orderNumber)
        .single();
      orderData = data;
    }

    if (!orderData && orderId) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, location_id, status, order_type, subtotal, tax, total, notes, created_at, pickup_time, customer_name, customer_phone, payment_status, payment_method, discount, coupon_code, rewards_used, rewards_discount, amount_paid, source")
        .eq("id", orderId)
        .single();
      orderData = data;
    }

    if (!orderData) {
      return json(404, { error: "Order not found" });
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, name, quantity, unit_price, total_price, customizations")
      .eq("order_id", orderData.id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    return json(200, {
      order: {
        ...orderData,
        items: items || [],
      },
    });
  } catch (error) {
    console.error("get-order-details error:", error);
    return json(500, { error: "Internal server error" });
  }
});
