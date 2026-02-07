import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Safe fields that can be returned to clients (never includes password_hash)
const SAFE_COLUMNS = "id, email, phone, full_name, email_verified, phone_verified";

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
    const body = await req.json();
    const { action, email, customerId } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine action based on params (backward compatible with existing callers)
    const resolvedAction = action || (email ? "lookup-email" : customerId ? "lookup-id" : null);

    if (!resolvedAction) {
      return json(400, { error: "email, customerId, or action is required" });
    }

    switch (resolvedAction) {
      case "lookup-email": {
        // Look up by email - used during checkout to check if account exists
        if (!email || typeof email !== "string" || email.length > 254) {
          return json(400, { error: "Invalid email" });
        }

        const { data, error } = await supabase
          .from("customers")
          .select(SAFE_COLUMNS)
          .eq("email", email.toLowerCase().trim());

        if (error) {
          console.error("Error looking up customer by email:", error);
          return json(500, { error: "Failed to look up customer" });
        }
        return json(200, { customers: data || [] });
      }

      case "lookup-id": {
        // Look up by ID - used for profile refresh
        if (!customerId || typeof customerId !== "string") {
          return json(400, { error: "Invalid customerId" });
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(customerId)) {
          return json(400, { error: "Invalid customerId format" });
        }

        const { data, error } = await supabase
          .from("customers")
          .select(SAFE_COLUMNS)
          .eq("id", customerId)
          .single();

        if (error) {
          console.error("Error looking up customer by id:", error);
          return json(200, { customer: null });
        }
        return json(200, { customer: data });
      }

      case "register": {
        // Create a new customer account
        const regEmail = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
        const regPhone = typeof body.phone === "string" ? body.phone.trim() : "";
        const regName = typeof body.fullName === "string" ? body.fullName.trim() : null;

        if (!regEmail || !regPhone) {
          return json(400, { error: "Email and phone are required" });
        }
        if (regEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
          return json(400, { error: "Invalid email format" });
        }
        if (regPhone.length > 20) {
          return json(400, { error: "Invalid phone number" });
        }

        const { data: newCustomer, error: createError } = await supabase
          .from("customers")
          .insert({
            email: regEmail,
            phone: regPhone,
            full_name: regName,
          })
          .select(SAFE_COLUMNS)
          .single();

        if (createError) {
          if (createError.code === "23505") {
            return json(200, { error: "This email is already registered", code: "23505" });
          }
          console.error("Error creating customer:", createError);
          return json(500, { error: "Failed to create customer account" });
        }

        console.log("Customer registered:", regEmail);
        return json(200, { customer: newCustomer });
      }

      case "update": {
        // Update customer profile fields
        const updateId = typeof body.customerId === "string" ? body.customerId : "";
        if (!updateId) {
          return json(400, { error: "customerId is required for update" });
        }
        const uuidRegex2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex2.test(updateId)) {
          return json(400, { error: "Invalid customerId format" });
        }

        // Only allow specific safe fields to be updated (never password_hash)
        const allowedFields = ["phone", "full_name", "email_verified", "phone_verified"];
        const safeUpdate: Record<string, unknown> = {};
        for (const key of allowedFields) {
          if (body[key] !== undefined) {
            safeUpdate[key] = body[key];
          }
        }

        if (Object.keys(safeUpdate).length === 0) {
          return json(400, { error: "No valid fields to update" });
        }

        // Validate field values
        if (safeUpdate.phone !== undefined) {
          if (typeof safeUpdate.phone !== "string" || (safeUpdate.phone as string).length > 20) {
            return json(400, { error: "Invalid phone number" });
          }
        }
        if (safeUpdate.full_name !== undefined) {
          if (typeof safeUpdate.full_name !== "string" || (safeUpdate.full_name as string).length > 200) {
            return json(400, { error: "Invalid name" });
          }
        }
        if (safeUpdate.email_verified !== undefined && typeof safeUpdate.email_verified !== "boolean") {
          return json(400, { error: "Invalid email_verified value" });
        }
        if (safeUpdate.phone_verified !== undefined && typeof safeUpdate.phone_verified !== "boolean") {
          return json(400, { error: "Invalid phone_verified value" });
        }

        const { error: updateError } = await supabase
          .from("customers")
          .update(safeUpdate)
          .eq("id", updateId);

        if (updateError) {
          console.error("Error updating customer:", updateError);
          return json(500, { error: "Failed to update customer" });
        }

        console.log("Customer updated:", updateId, Object.keys(safeUpdate));
        return json(200, { success: true });
      }

      default:
        return json(400, { error: "Invalid action" });
    }
  } catch (error) {
    console.error("customer-profile error:", error);
    return json(500, { error: "Internal server error" });
  }
});
