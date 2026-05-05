import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req, res) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autenticado' })
    return null
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data: { user }, error } = await supabase.auth.getUser(auth.slice(7))
  if (error || !user) {
    res.status(401).json({ error: 'Token inválido o expirado' })
    return null
  }

  return user
}
