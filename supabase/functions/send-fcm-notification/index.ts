import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Send-fcm-notification called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID')
    const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')

    if (!supabaseUrl || !serviceRoleKey || !firebaseProjectId || !firebaseServiceAccount) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required environment variables',
          missing: {
            supabaseUrl: !supabaseUrl,
            serviceRoleKey: !serviceRoleKey,
            firebaseProjectId: !firebaseProjectId,
            firebaseServiceAccount: !firebaseServiceAccount
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Get all active FCM tokens
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('fcm_tokens')
      .select('*')
      .eq('is_active', true)

    if (tokenError) {
      console.error('Error fetching FCM tokens:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch FCM tokens', details: tokenError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active FCM tokens found',
          tokenCount: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let failureCount = 0
    const results = []

    console.log(`Processing ${tokens.length} FCM tokens`)

    for (const tokenRecord of tokens) {
      try {
        // Get user's vocabulary words
        const { data: words } = await supabaseClient
          .from('vocabulary_words')
          .select('*')
          .eq('user_id', tokenRecord.user_id)

        if (!words || words.length === 0) {
          results.push({ 
            tokenId: tokenRecord.id, 
            status: 'skipped', 
            reason: 'no vocabulary words' 
          })
          continue
        }

        const randomWord = words[Math.floor(Math.random() * words.length)]

        // Get OAuth 2.0 access token for FCM v1 API
        const accessToken = await getFCMAccessToken(firebaseServiceAccount)
        
        if (!accessToken) {
          results.push({
            tokenId: tokenRecord.id,
            status: 'failed',
            error: 'Failed to get FCM access token'
          })
          failureCount++
          continue
        }

        // Prepare FCM v1 message
        const fcmMessage = {
          message: {
            token: tokenRecord.token,
            notification: {
              title: '英単語学習リマインダー',
              body: `「${randomWord.word}」の意味は覚えていますか？`,
              image: '/logo192.png'
            },
            data: {
              word: randomWord.word,
              meaning: randomWord.meaning,
              type: 'vocabulary_reminder',
              click_action: '/'
            },
            webpush: {
              headers: {
                'TTL': '86400'
              },
              notification: {
                icon: '/logo192.png',
                badge: '/logo192.png',
                requireInteraction: false
              },
              fcm_options: {
                link: '/'
              }
            }
          }
        }

        console.log(`Sending FCM v1 notification to token: ${tokenRecord.token.substring(0, 20)}...`)

        // Send to FCM v1 API
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmMessage)
          }
        )

        const fcmResult = await fcmResponse.json()
        console.log(`FCM v1 response for token ${tokenRecord.id}:`, fcmResponse.status, fcmResult)

        if (fcmResponse.ok) {
          successCount++
          results.push({
            tokenId: tokenRecord.id,
            status: 'sent',
            fcmResponse: fcmResult
          })
        } else {
          failureCount++
          results.push({
            tokenId: tokenRecord.id,
            status: 'failed',
            error: fcmResult.error?.message || 'Unknown FCM error',
            fcmResponse: fcmResult
          })

          // If token is invalid, mark it as inactive
          if (fcmResult.error?.details?.[0]?.errorCode === 'UNREGISTERED' || 
              fcmResult.error?.details?.[0]?.errorCode === 'INVALID_ARGUMENT') {
            console.log(`Marking invalid token ${tokenRecord.id} as inactive`)
            await supabaseClient
              .from('fcm_tokens')
              .update({ is_active: false })
              .eq('id', tokenRecord.id)
          }
        }

      } catch (error) {
        console.error(`Error processing token ${tokenRecord.id}:`, error)
        failureCount++
        results.push({
          tokenId: tokenRecord.id,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'FCM notification sending completed',
        totalTokens: tokens.length,
        successCount,
        failureCount,
        results: results.slice(0, 10), // Limit results for response size
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-fcm-notification function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Function to get OAuth 2.0 access token for FCM v1 API
async function getFCMAccessToken(serviceAccountKey: string): Promise<string | null> {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey)
    
    // Create JWT for Google OAuth 2.0
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }
    
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    }
    
    // Create unsigned JWT
    const headerB64 = btoa(JSON.stringify(header))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    const unsignedToken = `${headerB64}.${payloadB64}`
    
    // Sign with private key using Web Crypto API
    const privateKeyPem = serviceAccount.private_key
    const signature = await signJWT(unsignedToken, privateKeyPem)
    
    if (!signature) {
      console.error('Failed to sign JWT')
      return null
    }
    
    const jwt = `${unsignedToken}.${signature}`
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    })
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Failed to get access token:', error)
      return null
    }
    
    const tokenData = await tokenResponse.json()
    return tokenData.access_token
    
  } catch (error) {
    console.error('Error getting FCM access token:', error)
    return null
  }
}

// Function to sign JWT with RSA private key
async function signJWT(data: string, privateKeyPem: string): Promise<string | null> {
  try {
    // Convert PEM to ArrayBuffer
    const pemContents = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '')
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
    
    // Import the private key
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    )
    
    // Sign the data
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, dataBuffer)
    
    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature)
    let binary = ''
    for (let i = 0; i < signatureArray.byteLength; i++) {
      binary += String.fromCharCode(signatureArray[i])
    }
    
    return btoa(binary)
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
  } catch (error) {
    console.error('Error signing JWT:', error)
    return null
  }
}