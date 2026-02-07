import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compareSync, hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Legacy SHA-256 hash for backwards compatibility during migration
async function sha256Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

  const invalidCredentials = () =>
    json(200, { success: false, error: "Invalid email or password" });

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Input validation
    if (!email || !password) {
      return json(200, { success: false, error: "Email and password are required" });
    }
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(200, { success: false, error: "Invalid email format" });
    }
    if (password.length > 128) {
      return json(200, { success: false, error: "Invalid credentials" });
    }

    console.log("Customer login request for:", email);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find customer by email (server-side, password_hash needed for verification)
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email, phone, full_name, email_verified, phone_verified, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (customerError) {
      console.error("Error fetching customer:", customerError);
      // Add artificial delay to prevent timing attacks
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      return invalidCredentials();
    }

    if (!customer) {
      // Add artificial delay to prevent user enumeration via timing
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      return invalidCredentials();
    }

    if (!customer.password_hash) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      return invalidCredentials();
    }

    // Try bcrypt first, then fallback to legacy SHA-256
    let passwordValid = false;
    const isBcryptHash = customer.password_hash.startsWith("$2");

    if (isBcryptHash) {
      passwordValid = compareSync(password, customer.password_hash);
    } else {
      // Legacy SHA-256 comparison
      const sha256Result = await sha256Hash(password);
      passwordValid = sha256Result === customer.password_hash;

      // If valid, transparently migrate to bcrypt
      if (passwordValid) {
        console.log("Migrating password hash to bcrypt for:", email);
        const bcryptHash = hashSync(password);
        await supabase
          .from("customers")
          .update({ password_hash: bcryptHash })
          .eq("id", customer.id);
      }
    }

    if (!passwordValid) {
      console.log("Password mismatch for:", email);
      return invalidCredentials();
    }

    const sessionToken = crypto.randomUUID();
    console.log("Customer login successful:", email);

    return json(200, {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        fullName: customer.full_name,
        emailVerified: customer.email_verified,
        phoneVerified: customer.phone_verified,
      },
      sessionToken,
    });
  } catch (error: any) {
    console.error("Error in customer-login:", error);
    return json(200, { success: false, error: "Login failed. Please try again." });
  }
};

serve(handler);
