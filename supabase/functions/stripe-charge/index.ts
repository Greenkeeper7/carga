// Supabase Edge Function — Cobra una sesión de carga con Stripe
// La secret key de Stripe NUNCA va en el frontend.
// Configúrala en Supabase con: supabase secrets set STRIPE_SECRET_KEY=sk_test_...
import Stripe from 'npm:stripe@17'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20',
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const { payment_method_id, amount_eur, description } = await req.json()

    if (!payment_method_id || !amount_eur) {
      return new Response(
        JSON.stringify({ error: 'payment_method_id y amount_eur son obligatorios' }),
        { status: 400, headers: CORS }
      )
    }

    // Crea y confirma el cobro en un solo paso
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount_eur * 100), // Stripe trabaja en céntimos
      currency: 'eur',
      payment_method: payment_method_id,
      description: description ?? 'Sesión de carga — Carga App',
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Necesario para cobros sin redirect
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount_eur,
      }),
      { headers: CORS }
    )
  } catch (err) {
    console.error('Stripe error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 400, headers: CORS }
    )
  }
})
