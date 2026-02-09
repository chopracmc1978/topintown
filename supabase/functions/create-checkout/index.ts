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
    const { 
      items, 
      subtotal, 
      tax, 
      total, 
      customerName, 
      customerPhone, 
      customerEmail,
      customerId,
      locationId,
      notes,
      pickupTime,
      discount,
      couponCode,
      rewardsUsed,
      rewardsDiscount
    } = await req.json();

    console.log("Creating checkout session for:", { customerName, customerEmail, total, itemCount: items?.length, pickupTime, rewardsUsed });

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    // Initialize Supabase with service role for DB operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store full payload in checkout_drafts table (no more metadata size limits!)
    const fullPayload = {
      items,
      subtotal,
      tax,
      total,
      discount,
      couponCode,
      rewardsUsed,
      rewardsDiscount,
      customerName,
      customerPhone,
      customerEmail,
      customerId,
      locationId,
      notes,
      pickupTime,
    };

    const { data: draft, error: draftError } = await supabase
      .from("checkout_drafts")
      .insert({ payload: fullPayload })
      .select("id")
      .single();

    if (draftError || !draft) {
      console.error("Error creating checkout draft:", draftError);
      throw new Error("Failed to store checkout data");
    }

    console.log("Checkout draft created:", draft.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Build line items for Stripe — individual items for clear visibility
    const lineItems: any[] = items.map((item: any) => ({
      price_data: {
        currency: "cad",
        product_data: {
          name: item.name,
          description: item.pizzaCustomization 
            ? `${item.pizzaCustomization.size?.name || ''} - ${item.pizzaCustomization.crust?.name || ''}`
            : item.wingsCustomization
            ? `Flavor: ${item.wingsCustomization.flavor}`
            : item.selectedSize || undefined,
        },
        unit_amount: Math.round((item.totalPrice / item.quantity) * 100),
      },
      quantity: item.quantity,
    }));

    // Calculate total discount (rewards + coupon)
    const totalDiscount = (rewardsDiscount || 0) + (discount || 0);

    // If there's a discount, add it as a visible line item by reducing from subtotal
    // We do this by adding a "Discount" line item and adjusting tax line accordingly
    if (totalDiscount > 0) {
      // Build a short label for the discount
      const discountLabel = rewardsDiscount && discount
        ? "Rewards + Coupon Discount"
        : rewardsDiscount
        ? `Rewards (${rewardsUsed} pts)`
        : couponCode
        ? `Coupon (${couponCode})`
        : "Discount";

      // Add discount as a separate item that reduces the total
      // Stripe doesn't allow negative unit_amount, so we subtract discount
      // proportionally from each item. Instead, we use a simpler approach:
      // Just send the final total as a single charge line + item details as metadata
    }

    // ROBUST APPROACH: Use the pre-calculated total directly.
    // Our checkout page already shows the full item breakdown.
    // This avoids coupon API limits, character restrictions, and math drift.
    const totalInCents = Math.round(total * 100);

    // Build a summary description from items
    const itemSummary = items
      .map((item: any) => `${item.name} x${item.quantity}`)
      .join(', ');

    const stripeLineItems = [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: "Order Total",
            description: itemSummary.length > 500 
              ? itemSummary.slice(0, 497) + '...' 
              : itemSummary,
          },
          unit_amount: totalInCents,
        },
        quantity: 1,
      },
    ];

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "https://topintown.lovable.app";

    // Minimal metadata - just the draft ID (everything else is in the DB)
    const metadata: Record<string, string> = {
      draftId: draft.id,
    };

    console.log("Charging total:", total, "totalInCents:", totalInCents, "discount:", totalDiscount);

    // Create Stripe checkout session with the exact total
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail || undefined,
      line_items: stripeLineItems,
      mode: "payment",
      success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata,
    });

    console.log("Checkout session created:", session.id);

    // Update draft with stripe session id
    await supabase
      .from("checkout_drafts")
      .update({ stripe_session_id: session.id })
      .eq("id", draft.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
