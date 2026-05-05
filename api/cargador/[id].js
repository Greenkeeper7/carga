import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { id } = req.query

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data, error } = await supabase
    .from('Cargadores')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return res.status(status).json({ error: error.message })
  }
  res.status(200).json(data)
}
