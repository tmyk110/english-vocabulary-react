import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Send-push-simple called:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS for send-push-simple')
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  // Check for auth header but don't require it for testing
  const authHeader = req.headers.get('Authorization')
  console.log('Has auth:', !!authHeader)

  return new Response(
    JSON.stringify({ 
      message: 'Simple push test successful',
      method: req.method,
      hasAuth: !!authHeader,
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
})