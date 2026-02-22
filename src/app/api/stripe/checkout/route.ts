import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe-config";

export async function POST(request: NextRequest) {
  try {
    const { user_id, email } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        { error: "Stripe not configured. Set STRIPE_SECRET_KEY env var." },
        { status: 500 }
      );
    }

    if (!user_id || !email) {
      return NextResponse.json({ error: "User ID and email required" }, { status: 400 });
    }

    if (!PLANS.pro.price_id) {
      return NextResponse.json(
        { error: "Stripe not configured. Set STRIPE_PRO_PRICE_ID env var." },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: PLANS.pro.price_id, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}?cancelled=true`,
      metadata: { user_id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
