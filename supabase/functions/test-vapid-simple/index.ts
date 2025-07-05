import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Test-vapid-simple called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Check environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    console.log('Environment check:', {
      hasVapidPublic: !!vapidPublicKey,
      hasVapidPrivate: !!vapidPrivateKey,
      publicKeyLength: vapidPublicKey?.length,
      privateKeyLength: vapidPrivateKey?.length,
      publicKeyPreview: vapidPublicKey?.substring(0, 20) + '...',
      privateKeyPreview: vapidPrivateKey?.substring(0, 20) + '...'
    })

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ 
          error: 'VAPID keys not found in environment',
          hasPublic: !!vapidPublicKey,
          hasPrivate: !!vapidPrivateKey
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test sending to a hardcoded FCM endpoint (for testing only)
    const testEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint'
    
    console.log('Testing VAPID JWT creation...')
    const vapidJWT = createVapidJWT(testEndpoint, vapidPrivateKey)
    console.log('VAPID JWT created:', vapidJWT.substring(0, 50) + '...')

    // Create authorization header
    const authHeader = `vapid t=${vapidJWT}, k=${vapidPublicKey}`
    console.log('Auth header created:', authHeader.substring(0, 100) + '...')

    // Test the JWT format
    const jwtParts = vapidJWT.split('.')
    console.log('JWT analysis:', {
      partCount: jwtParts.length,
      headerLength: jwtParts[0]?.length,
      payloadLength: jwtParts[1]?.length,
      signatureLength: jwtParts[2]?.length
    })

    try {
      const header = JSON.parse(atob(jwtParts[0].replace(/-/g, '+').replace(/_/g, '/')))
      const payload = JSON.parse(atob(jwtParts[1].replace(/-/g, '+').replace(/_/g, '/')))
      console.log('JWT header:', header)
      console.log('JWT payload:', payload)
    } catch (parseError) {
      console.error('JWT parsing error:', parseError)
    }

    return new Response(
      JSON.stringify({
        message: 'VAPID test completed',
        environment: {
          hasPublicKey: !!vapidPublicKey,
          hasPrivateKey: !!vapidPrivateKey,
          publicKeyLength: vapidPublicKey?.length,
          privateKeyLength: vapidPrivateKey?.length
        },
        jwt: {
          created: !!vapidJWT,
          length: vapidJWT.length,
          partCount: jwtParts.length,
          preview: vapidJWT.substring(0, 50) + '...'
        },
        authHeader: {
          created: !!authHeader,
          length: authHeader.length,
          preview: authHeader.substring(0, 100) + '...'
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in test-vapid-simple function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function createVapidJWT(endpoint: string, vapidPrivateKey: string): string {
  try {
    const url = new URL(endpoint)
    const audience = `${url.protocol}//${url.host}`
    
    const header = {
      typ: 'JWT',
      alg: 'ES256'
    }
    
    const payload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 43200,
      sub: 'mailto:test@example.com'
    }
    
    // Base64URL encode
    const headerB64 = btoa(JSON.stringify(header))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    // Simple signature for testing
    const signature = btoa('signature').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    return `${headerB64}.${payloadB64}.${signature}`
  } catch (error) {
    console.error('Error creating VAPID JWT:', error)
    return 'fallback'
  }
}