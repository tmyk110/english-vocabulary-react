import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

console.log('Supabase config:', { 
  url: supabaseUrl ? 'SET' : 'MISSING', 
  key: supabaseKey ? 'SET' : 'MISSING' 
})

export const supabase = createClient(supabaseUrl, supabaseKey)