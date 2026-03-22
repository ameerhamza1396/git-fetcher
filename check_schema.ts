
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  const { data, error } = await supabase.from('osce_stations').select('*').limit(1)
  if (error) {
    console.error(error)
  } else {
    console.log(Object.keys(data[0] || {}))
  }
}

checkSchema()
