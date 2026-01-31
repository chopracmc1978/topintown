import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LoginRequest {
  email: string;
  password: string;
}

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  const invalidCredentials = () =>
    // Return 200 so the client can show a friendly error without triggering a runtime overlay.
    json(200, { success: false, error: "Invalid email or password" });

  try {
    const { email, password }: LoginRequest = await req.json();
    console.log("Customer login request for:", email);

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (customerError) {
      console.error("Error fetching customer:", customerError);
      throw new Error("Failed to validate credentials");
    }

    if (!customer) {
      console.log("Customer not found:", email);
      return invalidCredentials();
    }

    // Check if customer has a password set
    if (!customer.password_hash) {
      // Treat as invalid credentials to avoid leaking account state.
      return invalidCredentials();
    }

    // Verify password
    const hashedPassword = await hashPassword(password);
    if (hashedPassword !== customer.password_hash) {
      console.log("Password mismatch for:", email);
      return invalidCredentials();
    }

    // Generate a simple session token (in production, use JWT)
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
    return json(400, { error: error.message });
  }
};

serve(handler);
