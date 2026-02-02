import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
      pickupTime
    } = await req.json();

    console.log("Creating checkout session for:", { customerName, customerEmail, total, itemCount: items?.length, pickupTime });

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Build line items for Stripe
    const lineItems = items.map((item: any) => ({
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
        unit_amount: Math.round((item.totalPrice / item.quantity) * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add tax as a separate line item
    lineItems.push({
      price_data: {
        currency: "cad",
        product_data: {
          name: "GST (5%)",
        },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "https://topintown.lovable.app";

    // Store item data with FULL customization objects in metadata
    // Split items across multiple metadata fields if needed
    const minimalItems = items.map((item: any) => ({
      n: item.name,
      q: item.quantity || 1,
      p: item.price || 0,
      t: item.totalPrice || 0,
      pid: item.pizzaCustomization?.originalItemId || item.wingsCustomization?.originalItemId || null,
      sz: item.selectedSize || null,
      // Store full customization objects
      pc: item.pizzaCustomization || null,  // Full pizza customization
      wc: item.wingsCustomization || null,  // Full wings customization
    }));

    // Split items into chunks that fit within 500 char limit
    const itemChunks: string[][] = [];
    let currentChunk: any[] = [];
    let currentChunkSize = 2; // Start with "[]" size

    for (const item of minimalItems) {
      const itemStr = JSON.stringify(item);
      const itemSize = itemStr.length + (currentChunk.length > 0 ? 1 : 0); // +1 for comma
      
      if (currentChunkSize + itemSize > 490) { // Leave some margin
        if (currentChunk.length > 0) {
          itemChunks.push(currentChunk);
        }
        currentChunk = [item];
        currentChunkSize = 2 + itemStr.length;
      } else {
        currentChunk.push(item);
        currentChunkSize += itemSize;
      }
    }
    if (currentChunk.length > 0) {
      itemChunks.push(currentChunk);
    }

    // Build metadata with split items
    const metadata: Record<string, string> = {
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || "",
      customerId: customerId || "",
      locationId: locationId || "calgary",
      notes: notes || "",
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      total: total.toString(),
      itemChunks: itemChunks.length.toString(),
      pickupTime: pickupTime || "",
    };

    // Add each chunk as items0, items1, items2, etc.
    itemChunks.forEach((chunk, index) => {
      metadata[`items${index}`] = JSON.stringify(chunk);
    });

    console.log("Metadata chunks:", itemChunks.length, "Total items:", minimalItems.length);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail || undefined,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata,
    });

    console.log("Checkout session created:", session.id);

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
