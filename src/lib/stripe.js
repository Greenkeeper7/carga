import { loadStripe } from '@stripe/stripe-js'

// Cargamos Stripe una sola vez (singleton)
let stripePromise = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}
