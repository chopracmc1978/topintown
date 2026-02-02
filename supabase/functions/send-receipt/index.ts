import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: {
    size?: { name: string };
    crust?: { name: string };
    flavor?: string;
  };
}

interface SendReceiptRequest {
  orderId: string;
  email: string;
  customerName: string;
  orderNumber: string;
  orderDate: string;
  orderType: string;
  pickupTime?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: string;
  paymentMethod?: string;
  locationName: string;
  locationAddress: string;
  locationPhone: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatPickupTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const buildEmailHtml = (data: SendReceiptRequest): string => {
  const itemsHtml = data.items.map(item => {
    let customization = '';
    if (item.customizations?.size && item.customizations?.crust) {
      customization = `<br><span style="color: #666; font-size: 12px; margin-left: 10px;">${item.customizations.size.name}, ${item.customizations.crust.name}</span>`;
    } else if (item.customizations?.flavor) {
      customization = `<br><span style="color: #666; font-size: 12px; margin-left: 10px;">${item.customizations.flavor}</span>`;
    }
    return `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
          ${item.quantity}× ${item.name}${customization}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
          $${item.totalPrice.toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  const pickupTimeHtml = data.pickupTime ? `
    <tr>
      <td style="color: #666;">Scheduled Pickup:</td>
      <td style="font-weight: bold; color: #d32f2f;">${formatPickupTime(data.pickupTime)}</td>
    </tr>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Receipt - ${data.orderNumber}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d32f2f; margin: 0; font-size: 24px;">${data.locationName}</h1>
          <p style="color: #666; margin: 5px 0;">${data.locationAddress}</p>
          <p style="color: #666; margin: 5px 0;">${data.locationPhone}</p>
        </div>
        
        <!-- Receipt Title -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333;">Order Receipt</h2>
          <p style="color: #666; margin: 5px 0;">Thank you for your order, ${data.customerName}!</p>
        </div>
        
        <!-- Order Details -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="color: #666;">Order #:</td>
            <td style="font-weight: bold;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="color: #666;">Date:</td>
            <td>${formatDate(data.orderDate)}</td>
          </tr>
          <tr>
            <td style="color: #666;">Type:</td>
            <td style="text-transform: capitalize;">${data.orderType}</td>
          </tr>
          ${pickupTimeHtml}
        </table>
        
        <!-- Items -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="border-bottom: 2px solid #333;">
            <th style="text-align: left; padding: 10px 0;">Items</th>
            <th style="text-align: right; padding: 10px 0;">Price</th>
          </tr>
          ${itemsHtml}
        </table>
        
        <!-- Totals -->
        <table style="width: 100%; font-size: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 5px 0;">Subtotal:</td>
            <td style="text-align: right;">$${data.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">GST (5%):</td>
            <td style="text-align: right;">$${data.tax.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 18px; border-top: 2px solid #333;">
            <td style="padding: 10px 0;">Total:</td>
            <td style="text-align: right; color: #d32f2f;">$${data.total.toFixed(2)}</td>
          </tr>
        </table>
        
        <!-- Payment Status -->
        <div style="background-color: ${data.paymentStatus === 'paid' ? '#e8f5e9' : '#fff3e0'}; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <strong style="color: ${data.paymentStatus === 'paid' ? '#2e7d32' : '#f57c00'};">
            ${data.paymentStatus === 'paid' ? `PAID - ${(data.paymentMethod || 'Card').toUpperCase()}` : 'PAYMENT DUE AT PICKUP'}
          </strong>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Please keep this receipt for your records.</p>
          <p style="margin-top: 10px;">Questions? Call us at ${data.locationPhone}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-receipt function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: SendReceiptRequest = await req.json();
    console.log("Sending receipt to:", data.email, "for order:", data.orderNumber);

    // Validate required fields
    if (!data.email || !data.orderNumber) {
      throw new Error("Missing required fields: email and orderNumber");
    }

    const emailHtml = buildEmailHtml(data);

    const emailResponse = await resend.emails.send({
      from: "Top In Town Pizza <noreply@topintownpizza.ca>",
      to: [data.email],
      subject: `Your Receipt - Order #${data.orderNumber}`,
      html: emailHtml,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
