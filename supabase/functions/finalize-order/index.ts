import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    console.log("Finalizing order for Stripe session:", sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("Session status:", session.payment_status, "| Session ID:", session.id);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Initialize Supabase with service role for DB operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if order already exists for this session (idempotency)
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("stripe_session_id", sessionId)
      .single();

    if (existingOrder) {
      console.log("Order already exists for session:", existingOrder.order_number);
      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          alreadyCreated: true
        }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get draftId from metadata and fetch full payload from checkout_drafts
    const draftId = session.metadata?.draftId;
    if (!draftId) {
      throw new Error("Missing draft ID in session metadata");
    }

    const { data: draft, error: draftError } = await supabase
      .from("checkout_drafts")
      .select("payload")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      console.error("Error fetching checkout draft:", draftError);
      throw new Error("Checkout draft not found");
    }

    const payload = draft.payload as any;
    const customerName = payload.customerName || null;
    const customerPhone = payload.customerPhone || null;
    const customerId = payload.customerId || null;
    const locationId = payload.locationId || "calgary";
    const notes = payload.notes || null;
    const subtotal = parseFloat(payload.subtotal || "0");
    const tax = parseFloat(payload.tax || "0");
    const total = parseFloat(payload.total || "0");
    const pickupTime = payload.pickupTime || null;
    const items = payload.items || [];

    console.log("Creating order with:", { customerName, locationId, itemCount: items.length });

    // Generate order number via RPC
    const { data: orderNumber, error: orderNumError } = await supabase.rpc(
      "next_order_number", 
      { p_location_id: locationId }
    );
    
    if (orderNumError) {
      console.error("Error generating order number:", orderNumError);
      throw new Error("Failed to generate order number");
    }

    console.log("Generated order number:", orderNumber);

    // Create order with payment_status = 'paid'
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_id: locationId,
        status: "pending",
        source: "web",
        order_type: "pickup",
        payment_status: "paid",
        payment_method: "card",
        subtotal,
        tax,
        total,
        notes,
        stripe_session_id: sessionId,
        pickup_time: pickupTime || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order: " + orderError.message);
    }

    console.log("Order created:", order.id);

    // Create order items - items now have FULL customization data (no compression!)
    if (items.length > 0) {
      const orderItems = items.map((item: any) => {
        // Determine which customization to store (prioritize combo, then pizza, then wings)
        let finalCustomization = null;
        if (item.comboCustomization?.comboId) {
          finalCustomization = item.comboCustomization;
        } else if (item.pizzaCustomization?.size) {
          finalCustomization = item.pizzaCustomization;
        } else if (item.wingsCustomization?.flavor) {
          finalCustomization = item.wingsCustomization;
        } else if (item.selectedSize) {
          finalCustomization = { size: item.selectedSize };
        }
        
        return {
          order_id: order.id,
          menu_item_id: item.pizzaCustomization?.originalItemId || item.wingsCustomization?.originalItemId || null,
          name: item.name || 'Item',
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: item.totalPrice || 0,
          customizations: finalCustomization,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
        // Don't throw - order is created, items failed
      } else {
        console.log("Order items created:", orderItems.length);
      }
    }

    // Mark draft as completed
    await supabase
      .from("checkout_drafts")
      .update({ status: "completed" })
      .eq("id", draftId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: order.id,
        orderNumber: order.order_number 
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error finalizing order:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
