import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escucha cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut = () => supabase.auth.signOut()

  // Guarda el payment method de Stripe en los metadatos del usuario
  const savePaymentMethod = async ({ pmId, last4, brand }) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { stripe_pm_id: pmId, card_last4: last4, card_brand: brand },
    })
    if (!error) setUser(data.user)
    return { error }
  }

  const hasPaymentMethod = !!(user?.user_metadata?.stripe_pm_id)

  return (
    <AuthContext.Provider
      value={{ user, loading, hasPaymentMethod, signIn, signUp, signOut, savePaymentMethod }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
