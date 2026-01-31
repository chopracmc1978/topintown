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
      .single();

    if (customerError || !customer) {
      console.log("Customer not found:", email);
      throw new Error("Invalid email or password");
    }

    // Check if customer has a password set
    if (!customer.password_hash) {
      throw new Error("Please set up a password first by checking out");
    }

    // Verify password
    const hashedPassword = await hashPassword(password);
    if (hashedPassword !== customer.password_hash) {
      console.log("Password mismatch for:", email);
      throw new Error("Invalid email or password");
    }

    // Generate a simple session token (in production, use JWT)
    const sessionToken = crypto.randomUUID();

    console.log("Customer login successful:", email);

    return new Response(
      JSON.stringify({
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
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in customer-login:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
