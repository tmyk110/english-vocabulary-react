import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Generate-vapid called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Generate VAPID key pair using Web Crypto API
    console.log('Generating VAPID key pair...')
    
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true, // extractable
      ['sign', 'verify']
    )

    console.log('Key pair generated successfully')

    // Export the keys
    const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey)
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    // Convert to base64url format (required for VAPID)
    const publicKeyBase64 = bufferToBase64Url(publicKeyBuffer)
    const privateKeyBase64 = bufferToBase64Url(privateKeyBuffer)

    console.log('Keys exported and converted to base64url format')

    // Check current environment variables
    const currentVapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const currentVapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')

    console.log('Current VAPID keys:', {
      hasPublic: !!currentVapidPublic,
      hasPrivate: !!currentVapidPrivate,
      publicLength: currentVapidPublic?.length,
      privateLength: currentVapidPrivate?.length
    })

    return new Response(
      JSON.stringify({
        message: 'VAPID keys generated successfully',
        newKeys: {
          publicKey: publicKeyBase64,
          privateKey: privateKeyBase64
        },
        currentKeys: {
          hasPublic: !!currentVapidPublic,
          hasPrivate: !!currentVapidPrivate,
          publicKeyPreview: currentVapidPublic?.substring(0, 20) + '...',
          privateKeyPreview: currentVapidPrivate?.substring(0, 20) + '...'
        },
        instructions: [
          '1. Copy the new keys to Supabase Edge Functions > Secrets',
          '2. Set VAPID_PUBLIC_KEY to the publicKey value',
          '3. Set VAPID_PRIVATE_KEY to the privateKey value',
          '4. Re-create push subscriptions using the new public key',
          '5. Test push notifications again'
        ],
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
    console.error('Error generating VAPID keys:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate VAPID keys', 
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

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}