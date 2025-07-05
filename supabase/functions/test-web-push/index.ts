import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Test-web-push called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Import web-push library dynamically
    const webpush = await import('https://esm.sh/web-push@3.6.7')
    
    console.log('Web-push library loaded successfully')
    
    // Test basic library functionality
    const testResult = {
      message: 'Web-push library test successful',
      hasWebPush: !!webpush.default,
      methods: Object.keys(webpush.default || {}),
      timestamp: new Date().toISOString()
    }
    
    console.log('Test result:', testResult)

    return new Response(
      JSON.stringify(testResult),
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in test-web-push function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Web-push library test failed', 
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