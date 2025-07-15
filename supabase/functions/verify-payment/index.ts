
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("No session ID provided");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new Error("Session not found");
    }

    // Update order status based on payment status
    const paymentStatus = session.payment_status;
    let orderStatus = "pending";

    if (paymentStatus === "paid") {
      orderStatus = "paid";
    } else if (paymentStatus === "unpaid") {
      orderStatus = "failed";
    }

    // Update order in database
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .update({ 
        status: orderStatus,
        updated_at: new Date().toISOString()
      })
      .eq("stripe_session_id", session_id)
      .select()
      .single();

    if (orderError) {
      console.error("Error updating order:", orderError);
      throw new Error("Failed to update order");
    }

    // Create transaction record
    if (paymentStatus === "paid") {
      const { error: transactionError } = await supabaseClient
        .from("transactions")
        .insert([{
          order_id: order.id,
          user_id: order.user_id,
          amount: session.amount_total,
          currency: session.currency,
          payment_method: "stripe",
          transaction_id: session.payment_intent,
          status: "completed",
          metadata: {
            session_id: session_id,
            customer_id: session.customer
          }
        }]);

      if (transactionError) {
        console.error("Error creating transaction:", transactionError);
      }
    }

    console.log("Payment verified:", session_id, "Status:", orderStatus);

    return new Response(JSON.stringify({ 
      payment_status: paymentStatus,
      order_status: orderStatus,
      amount: session.amount_total,
      currency: session.currency
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Payment verification failed" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
