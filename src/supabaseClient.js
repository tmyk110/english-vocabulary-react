import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

console.log('Supabase config:', { 
  url: supabaseUrl ? 'SET' : 'MISSING', 
  key: supabaseKey ? 'SET' : 'MISSING' 
})

// 環境変数が設定されていない場合はダミークライアントを作成
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://dummy.supabase.co', 'dummy-key')