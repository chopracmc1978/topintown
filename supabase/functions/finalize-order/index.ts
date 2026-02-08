import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const discount = parseFloat(payload.discount || "0");
    const couponCode = payload.couponCode || null;
    const rewardsUsed = parseInt(payload.rewardsUsed || "0");
    const rewardsDiscount = parseFloat(payload.rewardsDiscount || "0");
    const pickupTime = payload.pickupTime || null;
    const items = payload.items || [];

    console.log("Creating order with:", { customerName, locationId, itemCount: items.length, rewardsUsed });

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
        discount: discount + rewardsDiscount,
        coupon_code: couponCode,
        rewards_used: rewardsUsed,
        rewards_discount: rewardsDiscount,
        notes,
        stripe_session_id: sessionId,
        pickup_time: pickupTime || null,
      })
      .select()
      .single();

    // If rewards were used, deduct them from the customer's balance
    if (rewardsUsed > 0 && customerPhone) {
      console.log("Deducting rewards:", rewardsUsed, "for phone:", customerPhone);
      
      // Get current rewards
      const { data: existingRewards } = await supabase
        .from("customer_rewards")
        .select("*")
        .eq("phone", customerPhone)
        .maybeSingle();

      if (existingRewards && existingRewards.points >= rewardsUsed) {
        // Deduct points
        await supabase
          .from("customer_rewards")
          .update({ points: existingRewards.points - rewardsUsed })
          .eq("id", existingRewards.id);

        // Record redemption in history
        await supabase
          .from("rewards_history")
          .insert({
            phone: customerPhone,
            customer_id: customerId || null,
            order_id: order?.id || null,
            points_change: -rewardsUsed,
            transaction_type: "redeemed",
            description: `Redeemed ${rewardsUsed} points for $${rewardsDiscount.toFixed(2)} discount`,
          });
          
        console.log("Rewards deducted successfully");
      }
    }

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

    // --- Auto-send email receipt to customer ---
    const customerEmail = payload.customerEmail;
    if (customerEmail) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);

          // Resolve location info
          const LOCATIONS: Record<string, { name: string; address: string; phone: string }> = {
            calgary: { name: "Top In Town Pizza - Calgary", address: "3250 60 ST NE, CALGARY, AB T1Y 3T5", phone: "(403) 280-7373 ext 1" },
            chestermere: { name: "Top In Town Pizza - Kinniburgh", address: "272 Kinniburgh Blvd unit 103, Chestermere, AB T1X 0V8", phone: "(403) 280-7373 ext 2" },
          };
          const loc = LOCATIONS[locationId] || LOCATIONS["calgary"];

          // Fetch order items for the receipt
          const { data: orderItemRows } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit", hour12: true,
          });

          const formatPickupTime = (d: string) => new Date(d).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit", hour12: true,
          });

          // Build items HTML
          const itemsHtml = (orderItemRows || []).map((item: any) => {
            let customization = "";
            const c = item.customizations;
            if (c?.selections && c.selections.length > 0) {
              customization = c.selections.map((sel: any) => {
                let detail = `<div style="color:#666;font-size:12px;margin-left:15px;">- ${sel.itemName || ""}${sel.flavor ? ` (${sel.flavor})` : ""}</div>`;
                if (sel.pizzaCustomization?.size) {
                  detail += `<div style="color:#666;font-size:12px;margin-left:25px;">${sel.pizzaCustomization.size.name || ""}, ${sel.pizzaCustomization.crust?.name || "Regular"}</div>`;
                }
                return detail;
              }).join("");
            } else if (c?.size) {
              const sizeName = typeof c.size === "string" ? c.size : c.size?.name || "";
              customization = sizeName ? `<br><span style="color:#666;font-size:12px;margin-left:10px;">${sizeName}${c.crust?.name ? `, ${c.crust.name}` : ""}</span>` : "";
              if (c.sauceName) {
                customization += `<br><span style="color:#666;font-size:12px;margin-left:10px;">Sauce: ${c.sauceName}</span>`;
              }
              if (c.extraToppings?.length > 0) {
                customization += `<br><span style="color:#666;font-size:12px;margin-left:10px;">+${c.extraToppings.map((t: any) => t.name).join(", ")}</span>`;
              }
            } else if (c?.flavor) {
              customization = `<br><span style="color:#666;font-size:12px;margin-left:10px;">${c.flavor}</span>`;
            }
            return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${item.quantity}× ${item.name}${customization}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top;">$${item.total_price.toFixed(2)}</td></tr>`;
          }).join("");

          const pickupHtml = pickupTime ? `<tr><td style="color:#666;">Scheduled Pickup:</td><td style="font-weight:bold;color:#d32f2f;">${formatPickupTime(pickupTime)}</td></tr>` : "";

          // Fetch reward points for the receipt
          let rewardPointsHtml = "";
          const cleanPhone = customerPhone?.replace(/\D/g, "");
          if (cleanPhone) {
            const [rewardsRes, earnedRes, redeemedRes] = await Promise.all([
              supabase.from("customer_rewards").select("points, lifetime_points").eq("phone", cleanPhone).maybeSingle(),
              supabase.from("rewards_history").select("points_change").eq("phone", cleanPhone).eq("order_id", order.id).eq("transaction_type", "earned").maybeSingle(),
              supabase.from("rewards_history").select("points_change").eq("phone", cleanPhone).eq("order_id", order.id).eq("transaction_type", "redeemed").maybeSingle(),
            ]);
            if (rewardsRes.data) {
              const currentBalance = rewardsRes.data.points;
              const earned = earnedRes.data?.points_change || 0;
              const used = Math.abs(redeemedRes.data?.points_change || 0);
              const lastBalance = currentBalance - earned + used;
              rewardPointsHtml = `
                <div style="background-color:#fff8e1;padding:15px;border-radius:8px;margin-bottom:20px;">
                  <p style="text-align:center;font-weight:bold;margin:0 0 10px 0;font-size:16px;">🎁 Reward Points</p>
                  <table style="width:100%;font-size:14px;">
                    <tr><td style="padding:3px 0;">Last Balance:</td><td style="text-align:right;font-weight:600;">${lastBalance} pts</td></tr>
                    ${earned > 0 ? `<tr><td style="padding:3px 0;color:#2e7d32;">Add:</td><td style="text-align:right;font-weight:600;color:#2e7d32;">+${earned} pts</td></tr>` : ""}
                    ${used > 0 ? `<tr><td style="padding:3px 0;color:#d32f2f;">Used:</td><td style="text-align:right;font-weight:600;color:#d32f2f;">-${used} pts</td></tr>` : ""}
                    <tr style="font-weight:bold;border-top:1px solid #e0c97f;"><td style="padding:5px 0;">Balance:</td><td style="text-align:right;">${currentBalance} pts</td></tr>
                  </table>
                </div>`;
            }
          }

          const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Your Receipt - ${orderNumber}</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f5f5f5;">
            <div style="background-color:white;border-radius:8px;padding:30px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align:center;margin-bottom:30px;">
                <h1 style="color:#d32f2f;margin:0;font-size:24px;">${loc.name}</h1>
                <p style="color:#666;margin:5px 0;">${loc.address}</p>
                <p style="color:#666;margin:5px 0;">${loc.phone}</p>
              </div>
              <div style="text-align:center;margin-bottom:20px;">
                <h2 style="margin:0;color:#333;">Order Receipt</h2>
                <p style="color:#666;margin:5px 0;">Thank you for your order, ${customerName || "Customer"}!</p>
              </div>
              <table style="width:100%;margin-bottom:20px;font-size:14px;">
                <tr><td style="color:#666;">Order #:</td><td style="font-weight:bold;">${orderNumber}</td></tr>
                <tr><td style="color:#666;">Date:</td><td>${formatDate(order.created_at)}</td></tr>
                <tr><td style="color:#666;">Type:</td><td style="text-transform:capitalize;">pickup</td></tr>
                ${pickupHtml}
              </table>
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
                <tr style="border-bottom:2px solid #333;"><th style="text-align:left;padding:10px 0;">Items</th><th style="text-align:right;padding:10px 0;">Price</th></tr>
                ${itemsHtml}
              </table>
              <table style="width:100%;font-size:14px;margin-bottom:20px;">
                <tr><td style="padding:5px 0;">Subtotal:</td><td style="text-align:right;">$${subtotal.toFixed(2)}</td></tr>
                <tr><td style="padding:5px 0;">GST (5%):</td><td style="text-align:right;">$${tax.toFixed(2)}</td></tr>
                <tr style="font-weight:bold;font-size:18px;border-top:2px solid #333;"><td style="padding:10px 0;">Total:</td><td style="text-align:right;color:#d32f2f;">$${total.toFixed(2)}</td></tr>
              </table>
              <div style="background-color:#e8f5e9;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;">
                <strong style="color:#2e7d32;">PAID - CARD</strong>
              </div>
              ${rewardPointsHtml}
              <div style="text-align:center;color:#666;font-size:12px;border-top:1px solid #eee;padding-top:20px;">
                <p>Please keep this receipt for your records.</p>
                <p style="margin-top:10px;">Questions? Call us at ${loc.phone}</p>
              </div>
            </div>
          </body></html>`;

          await resend.emails.send({
            from: "Top In Town Pizza <noreply@topintownpizza.ca>",
            to: [customerEmail],
            subject: `Your Receipt - Order #${orderNumber}`,
            html: emailHtml,
          });
          console.log("Receipt email sent to:", customerEmail);
        }
      } catch (emailErr: any) {
        // Don't fail the order if email sending fails
        console.error("Failed to send receipt email:", emailErr?.message || emailErr);
      }
    }

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
