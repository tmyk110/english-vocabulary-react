import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the send-push-notification function
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    // Log the result for monitoring
    console.log('Scheduled notification result:', result)

    return new Response(
      JSON.stringify({
        message: 'Scheduled notifications executed',
        timestamp: new Date().toISOString(),
        result: result
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in schedule-notifications function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})