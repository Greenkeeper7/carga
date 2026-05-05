import Stripe from 'stripe'
import { requireAuth } from './_auth.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const { amount_cents, description } = req.body

    if (!amount_cents || amount_cents < 50) {
      return res.status(400).json({ error: 'Importe mínimo: 0,50 €' })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount_cents),
      currency: 'eur',
      description: description ?? 'Sesión de carga — Carga App',
      automatic_payment_methods: { enabled: true },
      metadata: { user_id: user.id },
    })

    return res.status(200).json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    })
  } catch (err) {
    console.error('Stripe error:', err.message)
    return res.status(400).json({ error: err.message })
  }
}
