import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Compress pizza customization to minimal keys
const compressPizzaCustomization = (pc: any) => {
  if (!pc) return null;
  
  const compressed: any = {};
  
  // Size & Crust (required)
  if (pc.size) compressed.sz = { i: pc.size.id, n: pc.size.name, p: pc.size.price };
  if (pc.crust) compressed.cr = { i: pc.crust.id, n: pc.crust.name, p: pc.crust.price };
  
  // Optional fields - only include if non-default
  if (pc.cheeseType && pc.cheeseType !== 'mozzarella') compressed.ct = pc.cheeseType;
  if (pc.cheeseSides?.length > 0) compressed.cs = pc.cheeseSides;
  if (pc.sauceId) compressed.si = pc.sauceId;
  if (pc.sauceName && pc.sauceName !== 'Pizza Sauce') compressed.sn = pc.sauceName;
  if (pc.sauceQuantity && pc.sauceQuantity !== 'normal') compressed.sq = pc.sauceQuantity;
  
  // Spicy level - only if not 'none'
  if (pc.spicyLevel) {
    const hasSpicy = pc.spicyLevel.left !== 'none' || pc.spicyLevel.right !== 'none';
    if (hasSpicy) compressed.sl = pc.spicyLevel;
  }
  
  // Free toppings
  if (pc.freeToppings?.length > 0) compressed.ft = pc.freeToppings;
  
  // Default toppings - only store modifications (none/less/extra)
  if (pc.defaultToppings?.length > 0) {
    const modified = pc.defaultToppings.filter((t: any) => t.quantity !== 'regular');
    if (modified.length > 0) {
      compressed.dt = modified.map((t: any) => ({
        i: t.id, n: t.name, q: t.quantity, s: t.side !== 'whole' ? t.side : undefined
      }));
    }
  }
  
  // Extra toppings
  if (pc.extraToppings?.length > 0) {
    compressed.et = pc.extraToppings.map((t: any) => ({
      i: t.id, n: t.name, p: t.price, s: t.side !== 'whole' ? t.side : undefined
    }));
  }
  
  // Note
  if (pc.note) compressed.nt = pc.note;
  
  // Extra amount
  if (pc.extraAmount) compressed.ea = pc.extraAmount;
  
  // Original item ID
  if (pc.originalItemId) compressed.oi = pc.originalItemId;
  
  return compressed;
};

// Compress combo customization - keep FULL pizza customization details
const compressComboCustomization = (cc: any) => {
  if (!cc) return null;
  
  return {
    ci: cc.comboId,
    cn: cc.comboName,
    bp: cc.comboBasePrice,
    te: cc.totalExtraCharge,
    sl: cc.selections?.map((s: any) => {
      const selection: any = {
        it: s.itemType,
        in: s.itemName,
        ec: s.extraCharge || 0,
      };
      if (s.flavor) selection.fl = s.flavor;
      // Include FULL compressed pizza customization
      if (s.pizzaCustomization) {
        selection.pc = compressPizzaCustomization(s.pizzaCustomization);
      }
      return selection;
    }) || [],
  };
};

// Decompress back to full format (used by finalize-order)
export const decompressPizzaCustomization = (c: any) => {
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

    // Store compressed item data in metadata
    const minimalItems = items.map((item: any) => {
      const compressed: any = {
        n: item.name,
        q: item.quantity || 1,
        p: item.price || 0,
        t: item.totalPrice || 0,
        sz: item.selectedSize || null,
      };
      
      // Compress pizza customization to reduce size
      if (item.pizzaCustomization) {
        compressed.pc = compressPizzaCustomization(item.pizzaCustomization);
      }
      
      // Wings customization is already small
      if (item.wingsCustomization) {
        compressed.wc = { f: item.wingsCustomization.flavor, oi: item.wingsCustomization.originalItemId };
      }
      
      // Combo customization - compress it
      if (item.comboCustomization) {
        compressed.cc = compressComboCustomization(item.comboCustomization);
        console.log("Compressed combo:", JSON.stringify(compressed.cc).length, "chars");
      }
      
      return compressed;
    });

    // Split items into chunks that fit within 500 char limit
    // Each item must be its own chunk if it's large
    const itemChunks: any[][] = [];
    
    for (const item of minimalItems) {
      const itemStr = JSON.stringify([item]);
      console.log("Item", item.n, "size:", itemStr.length, "chars", item.cc ? "(has combo)" : "");
      
      if (itemStr.length > 490) {
        // Single item too large - need to split customization separately
        // Store basic item info and customization reference
        const basicItem: any = { n: item.n, q: item.q, p: item.p, t: item.t, sz: item.sz, ci: itemChunks.length };
        itemChunks.push([basicItem]);
        const basicItemIdx = itemChunks.length - 1;
        
        // Store customization in separate chunk(s)
        if (item.pc) {
          const pcStr = JSON.stringify({ _pc: item.pc, _ci: basicItemIdx });
          if (pcStr.length <= 490) {
            itemChunks.push([{ _pc: item.pc, _ci: basicItemIdx }]);
          } else {
            // Even compressed is too big - split into parts
            const parts = splitLargeObject(item.pc, 450);
            parts.forEach((part, idx) => {
              itemChunks.push([{ _pcp: idx, _pct: parts.length, _ci: basicItemIdx, ...part }]);
            });
          }
        }
        if (item.wc) {
          itemChunks.push([{ _wc: item.wc, _ci: basicItemIdx }]);
        }
        if (item.cc) {
          const ccStr = JSON.stringify({ _cc: item.cc, _ci: basicItemIdx });
          console.log("Combo chunk size:", ccStr.length);
          if (ccStr.length <= 490) {
            itemChunks.push([{ _cc: item.cc, _ci: basicItemIdx }]);
          } else {
            // Combo too big - split selections into multiple parts so each chunk stays under 500 chars.
            const partObjects = splitComboCustomizationBySelections(item.cc, basicItemIdx, 490);
            console.log("Splitting combo into", partObjects.length, "parts");
            partObjects.forEach((obj) => {
              itemChunks.push([obj]);
            });
          }
        }
      } else {
        // Item fits in a chunk - try to combine with previous
        const lastChunk = itemChunks[itemChunks.length - 1];
        if (lastChunk) {
          const combined = JSON.stringify([...lastChunk, item]);
          if (combined.length <= 490) {
            lastChunk.push(item);
            continue;
          }
        }
        itemChunks.push([item]);
      }
    }

    // Build metadata with split items
    const metadata: Record<string, string> = {
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || "",
      customerId: customerId || "",
      locationId: locationId || "calgary",
      notes: (notes || "").substring(0, 400), // Limit notes length
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      total: total.toString(),
      itemChunks: itemChunks.length.toString(),
      pickupTime: pickupTime || "",
    };

    // Add each chunk as items0, items1, items2, etc.
    itemChunks.forEach((chunk, index) => {
      const chunkStr = JSON.stringify(chunk);
      if (chunkStr.length > 500) {
        // Stripe hard-limits metadata values to 500 chars.
        console.warn(`Chunk ${index} is ${chunkStr.length} chars - will fail Stripe metadata limit`);
        throw new Error(`Checkout payload too large (chunk ${index}: ${chunkStr.length} chars)`);
      }
      metadata[`items${index}`] = chunkStr;
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

// Helper to split a large object into smaller parts
function splitLargeObject(obj: any, maxSize: number): any[] {
  const keys = Object.keys(obj);
  const parts: any[] = [];
  let currentPart: any = {};
  let currentSize = 2; // {}
  
  for (const key of keys) {
    const value = obj[key];
    const entryStr = JSON.stringify({ [key]: value });
    const entrySize = entryStr.length - 2; // Remove {} wrapper
    
    if (currentSize + entrySize > maxSize && Object.keys(currentPart).length > 0) {
      parts.push(currentPart);
      currentPart = {};
      currentSize = 2;
    }
    
    currentPart[key] = value;
    currentSize += entrySize + (Object.keys(currentPart).length > 1 ? 1 : 0); // comma
  }
  
  if (Object.keys(currentPart).length > 0) {
    parts.push(currentPart);
  }
  
  return parts;
}

// Split combo customization into multiple parts by slicing the selections array (sl)
// so each resulting metadata chunk stays under Stripe's 500-char metadata value limit.
function splitComboCustomizationBySelections(
  combo: any,
  basicItemIdx: number,
  maxChunkLen = 490
): any[] {
  const base: any = {
    ci: combo?.ci ?? combo?.comboId,
    cn: combo?.cn ?? combo?.comboName,
    bp: combo?.bp ?? combo?.comboBasePrice,
    te: combo?.te ?? combo?.totalExtraCharge,
  };

  const selections: any[] = combo?.sl ?? combo?.selections ?? [];
  const parts: any[][] = [];
  let current: any[] = [];

  // Use an intentionally large placeholder for _cct so our length check is conservative.
  const estimateLen = (sl: any[], partIndex: number) =>
    JSON.stringify([
      {
        _ccp: partIndex,
        _cct: 999,
        _ci: basicItemIdx,
        ...base,
        sl,
      },
    ]).length;

  for (const sel of selections) {
    const candidate = [...current, sel];
    const candidateLen = estimateLen(candidate, parts.length);

    if (candidateLen <= maxChunkLen) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      parts.push(current);
      current = [];
    }

    // If a single selection is too large, we have no safe way to split it further
    // without redesigning the payload format; fail fast with a clear error.
    const singleLen = estimateLen([sel], parts.length);
    if (singleLen > maxChunkLen) {
      throw new Error(
        `Combo selection too large for metadata (${singleLen} chars). Please reduce customizations or contact support.`
      );
    }

    current = [sel];
  }

  if (current.length > 0) parts.push(current);

  const total = parts.length;
  return parts.map((sl, idx) => ({
    _ccp: idx,
    _cct: total,
    _ci: basicItemIdx,
    ...base,
    sl,
  }));
}
