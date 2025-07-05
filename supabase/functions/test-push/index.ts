import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Test push function called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    // Check environment variables
    const envCheck = {
      VAPID_PUBLIC_KEY: !!Deno.env.get('VAPID_PUBLIC_KEY'),
      VAPID_PRIVATE_KEY: !!Deno.env.get('VAPID_PRIVATE_KEY'),
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    }
    
    console.log('Environment variables:', envCheck)

    // Test Supabase connection
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Test database query
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    console.log('Database query result:', { subscriptions, error })

    return new Response(
      JSON.stringify({
        message: 'Push test completed',
        envCheck,
        dbResult: {
          hasSubscriptions: !!subscriptions && subscriptions.length > 0,
          subscriptionCount: subscriptions?.length || 0,
          error: error?.message || null
        },
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Test push error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Test failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})