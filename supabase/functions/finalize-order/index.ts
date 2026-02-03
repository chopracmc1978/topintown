import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Decompress pizza customization back to full format
const decompressPizzaCustomization = (c: any) => {
  if (!c) return null;
  
  return {
    size: c.sz ? { id: c.sz.i, name: c.sz.n, price: c.sz.p } : null,
    crust: c.cr ? { id: c.cr.i, name: c.cr.n, price: c.cr.p } : null,
    cheeseType: c.ct || 'mozzarella',
    cheeseSides: c.cs || [],
    sauceId: c.si || null,
    sauceName: c.sn || 'Pizza Sauce',
    sauceQuantity: c.sq || 'normal',
    spicyLevel: c.sl || { left: 'none', right: 'none' },
    freeToppings: c.ft || [],
    defaultToppings: c.dt?.map((t: any) => ({
      id: t.i, name: t.n, quantity: t.q, side: t.s || 'whole', price: 0, isDefault: true
    })) || [],
    extraToppings: c.et?.map((t: any) => ({
      id: t.i, name: t.n, price: t.p, side: t.s || 'whole'
    })) || [],
    note: c.nt || '',
    extraAmount: c.ea || 0,
    originalItemId: c.oi || '',
  };
};

// Decompress wings customization
const decompressWingsCustomization = (c: any) => {
  if (!c) return null;
  return {
    flavor: c.f || c.flavor || '',
    originalItemId: c.oi || c.originalItemId || '',
  };
};

// Decompress combo customization back to full format
const decompressComboCustomization = (c: any) => {
  if (!c) return null;
  
  return {
    comboId: c.ci || c.comboId || '',
    comboName: c.cn || c.comboName || '',
    comboBasePrice: c.bp || c.comboBasePrice || 0,
    totalExtraCharge: c.te || c.totalExtraCharge || 0,
    selections: (c.sl || c.selections || []).map((s: any) => {
      const selection: any = {
        itemType: s.it || s.itemType || '',
        itemName: s.in || s.itemName || '',
        flavor: s.fl || s.flavor || undefined,
        extraCharge: s.ec || s.extraCharge || 0,
      };
      
      // Handle full pizza customization (compressed format)
      if (s.pc) {
        selection.pizzaCustomization = decompressPizzaCustomization(s.pc);
      } else if (s.pizzaCustomization) {
        selection.pizzaCustomization = s.pizzaCustomization;
      }
      
      return selection;
    }),
  };
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

    // Parse metadata from session
    const metadata = session.metadata || {};
    const customerName = metadata.customerName || null;
    const customerPhone = metadata.customerPhone || null;
    const customerEmail = metadata.customerEmail || null;
    const customerId = metadata.customerId || null;
    const locationId = metadata.locationId || "calgary";
    const notes = metadata.notes || null;
    const subtotal = parseFloat(metadata.subtotal || "0");
    const tax = parseFloat(metadata.tax || "0");
    const total = parseFloat(metadata.total || "0");
    const pickupTime = metadata.pickupTime || null;
    
    // Parse items from chunked metadata (items0, items1, etc.)
    let rawChunks: any[] = [];
    try {
      const chunkCount = parseInt(metadata.itemChunks || "0");
      if (chunkCount > 0) {
        for (let i = 0; i < chunkCount; i++) {
          const chunkData = metadata[`items${i}`];
          if (chunkData) {
            const chunkItems = JSON.parse(chunkData);
            rawChunks = rawChunks.concat(chunkItems);
          }
        }
      } else if (metadata.items) {
        // Fallback for old format
        rawChunks = JSON.parse(metadata.items);
      }
    } catch (e) {
      console.error("Error parsing items:", e);
    }

    // Reconstruct items from potentially split chunks
    // Handle both regular items and split customization chunks
    const itemsMap = new Map<number, any>();
    const customizationChunks: any[] = [];
    
    for (const chunk of rawChunks) {
      if (chunk._pc !== undefined || chunk._pcp !== undefined) {
        // This is a pizza customization chunk
        customizationChunks.push(chunk);
      } else if (chunk._wc !== undefined) {
        // This is a wings customization chunk
        customizationChunks.push(chunk);
      } else if (chunk._cc !== undefined || chunk._ccp !== undefined) {
        // This is a combo customization chunk
        customizationChunks.push(chunk);
        console.log("Found combo chunk:", JSON.stringify(chunk).substring(0, 100));
      } else if (chunk.ci !== undefined) {
        // This is a basic item with customization index reference
        itemsMap.set(chunk.ci, { ...chunk, pc: null, wc: null, cc: null });
      } else {
        // Regular complete item (may have cc directly)
        itemsMap.set(itemsMap.size, chunk);
        if (chunk.cc) {
          console.log("Item has direct combo:", chunk.n);
        }
      }
    }
    
    // Apply customization chunks to their items
    for (const cc of customizationChunks) {
      const itemIdx = cc._ci;
      const item = itemsMap.get(itemIdx);
      if (item) {
        if (cc._pc) {
          item.pc = cc._pc;
        }
        if (cc._wc) {
          item.wc = cc._wc;
        }
        if (cc._cc) {
          item.cc = cc._cc;
          console.log("Applied combo customization to item", itemIdx);
        }
        // Handle split pizza customization parts
        if (cc._pcp !== undefined) {
          if (!item._pcParts) item._pcParts = [];
          item._pcParts[cc._pcp] = cc;
        }
        // Handle split combo customization parts
        if (cc._ccp !== undefined) {
          if (!item._ccParts) item._ccParts = [];
          item._ccParts[cc._ccp] = cc;
        }
      }
    }
    
    // Merge split customization parts
    for (const [idx, item] of itemsMap) {
      if (item._pcParts) {
        const merged: any = {};
        for (const part of item._pcParts) {
          if (part) {
            const { _pcp, _pct, _ci, ...rest } = part;
            Object.assign(merged, rest);
          }
        }
        item.pc = merged;
        delete item._pcParts;
      }
      // Merge split combo parts
      if (item._ccParts) {
        const merged: any = {};
        for (const part of item._ccParts) {
          if (part) {
            const { _ccp, _cct, _ci, ...rest } = part;
            Object.assign(merged, rest);
          }
        }
        item.cc = merged;
        delete item._ccParts;
        console.log("Merged combo parts for item", idx);
      }
    }
    
    const items = Array.from(itemsMap.values());
    
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

    // Create order items from metadata with decompressed customization objects
    if (items.length > 0) {
      const orderItems = items.map((item: any) => {
        // Decompress customizations
        const pizzaCustomization = decompressPizzaCustomization(item.pc);
        const wingsCustomization = decompressWingsCustomization(item.wc);
        const comboCustomization = decompressComboCustomization(item.cc);
        
        // Determine which customization to store (prioritize combo, then pizza, then wings)
        let finalCustomization = null;
        if (comboCustomization?.comboId) {
          finalCustomization = comboCustomization;
        } else if (pizzaCustomization?.size) {
          finalCustomization = pizzaCustomization;
        } else if (wingsCustomization?.flavor) {
          finalCustomization = wingsCustomization;
        } else if (item.sz) {
          finalCustomization = { size: item.sz };
        }
        
        return {
          order_id: order.id,
          menu_item_id: pizzaCustomization?.originalItemId || wingsCustomization?.originalItemId || null,
          name: item.n || item.name || 'Item',
          quantity: item.q || item.quantity || 1,
          unit_price: item.p || item.price || 0,
          total_price: item.t || item.totalPrice || 0,
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
