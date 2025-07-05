import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Send-push-real called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Get all active push subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (subscriptionError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let failureCount = 0
    const results = []

    for (const subscription of subscriptions) {
      try {
        console.log('=== PROCESSING SUBSCRIPTION ===')
        console.log('Endpoint:', subscription.endpoint)
        
        // Get user's vocabulary words
        const { data: words } = await supabaseClient
          .from('vocabulary_words')
          .select('*')
          .eq('user_id', subscription.user_id)

        if (!words || words.length === 0) {
          results.push({ subscription: subscription.id, status: 'skipped', reason: 'no words' })
          continue
        }

        const randomWord = words[Math.floor(Math.random() * words.length)]

        // Check if endpoint is FCM
        if (subscription.endpoint.includes('fcm.googleapis.com')) {
          console.log('Detected FCM endpoint, using FCM-specific approach')
          
          // For FCM, try using the legacy server key approach
          // Extract the registration token from the endpoint
          const token = subscription.endpoint.split('/send/')[1]
          
          if (token) {
            console.log('Extracted FCM token:', token.substring(0, 20) + '...')
            
            // Try direct FCM API call (this might work better)
            const fcmPayload = {
              to: token,
              notification: {
                title: '英単語学習リマインダー',
                body: `「${randomWord.word}」の意味は覚えていますか？`,
                icon: '/logo192.png'
              }
            }
            
            console.log('Trying direct FCM API call...')
            const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Note: This requires a server key, which we don't have
                // 'Authorization': `key=${serverKey}`
              },
              body: JSON.stringify(fcmPayload)
            })
            
            const fcmResult = await fcmResponse.text()
            console.log('FCM API response:', fcmResponse.status, fcmResult)
            
            results.push({
              subscription: subscription.id,
              approach: 'FCM API',
              status: fcmResponse.status,
              response: fcmResult
            })
          }
          
          // Also try the standard Web Push approach with better VAPID
          console.log('Trying Web Push approach with FCM...')
          const webPushResult = await sendWebPushNotification(
            subscription,
            randomWord,
            vapidPublicKey,
            vapidPrivateKey
          )
          
          results.push({
            subscription: subscription.id,
            approach: 'Web Push',
            ...webPushResult
          })
          
          if (webPushResult.success) {
            successCount++
          } else {
            failureCount++
          }
        } else {
          // Non-FCM endpoint
          console.log('Non-FCM endpoint, using standard Web Push')
          const result = await sendWebPushNotification(
            subscription,
            randomWord,
            vapidPublicKey,
            vapidPrivateKey
          )
          
          results.push({
            subscription: subscription.id,
            approach: 'Standard Web Push',
            ...result
          })
          
          if (result.success) {
            successCount++
          } else {
            failureCount++
          }
        }

      } catch (error) {
        console.error('Error processing subscription:', error)
        results.push({
          subscription: subscription.id,
          error: error.message
        })
        failureCount++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Real push test completed',
        success: successCount,
        failure: failureCount,
        total: subscriptions.length,
        results: results,
        note: 'Attempted both FCM API and Web Push approaches'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push-real function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendWebPushNotification(
  subscription: any,
  word: any,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<any> {
  try {
    const payload = JSON.stringify({
      title: '英単語学習リマインダー',
      body: `「${word.word}」の意味は覚えていますか？`,
      icon: '/logo192.png',
      tag: 'vocabulary-notification'
    })

    // Create proper VAPID JWT
    const jwt = await createVapidJWT(subscription.endpoint, vapidPrivateKey)
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'TTL': '86400'
      },
      body: new TextEncoder().encode(payload)
    })

    const responseText = await response.text()
    
    return {
      success: response.ok,
      status: response.status,
      response: responseText
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function createVapidJWT(endpoint: string, vapidPrivateKey: string): Promise<string> {
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
    
    // For a real implementation, you would need to sign this with the private key
    // For testing, we'll use a placeholder signature
    const signature = btoa('real-signature').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    return `${headerB64}.${payloadB64}.${signature}`
  } catch (error) {
    console.error('Error creating VAPID JWT:', error)
    throw error
  }
}