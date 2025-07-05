import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

interface PushSubscription {
  endpoint: string
  p256dh_key: string
  auth_key: string
}

interface VocabularyWord {
  id: number
  word: string
  meaning: string
  user_id: string
}

serve(async (req) => {
  console.log('Send-push-notification called:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS for send-push-notification')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  // Check authorization header but don't require it for testing
  const authHeader = req.headers.get('Authorization')
  console.log('Auth header present:', !!authHeader)

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      hasVapidPublic: !!vapidPublicKey,
      hasVapidPrivate: !!vapidPrivateKey
    })

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { 
          status: 500, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Get all active push subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (subscriptionError) {
      console.error('Error fetching subscriptions:', subscriptionError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { 
          status: 500, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          status: 200, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    let successCount = 0
    let failureCount = 0

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Get user's vocabulary words
        const { data: words, error: wordsError } = await supabaseClient
          .from('vocabulary_words')
          .select('*')
          .eq('user_id', subscription.user_id)

        if (wordsError) {
          console.error('Error fetching words for user:', subscription.user_id, wordsError)
          failureCount++
          continue
        }

        if (!words || words.length === 0) {
          console.log('No words found for user:', subscription.user_id)
          continue
        }

        // Select random word
        const randomWord = words[Math.floor(Math.random() * words.length)]

        // Prepare push notification payload
        const payload = {
          title: '英単語学習リマインダー',
          body: `「${randomWord.word}」の意味は覚えていますか？\n意味: ${randomWord.meaning}`,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: 'daily-vocabulary',
          requireInteraction: true,
          actions: [
            {
              action: 'review',
              title: '復習する'
            },
            {
              action: 'dismiss',
              title: '後で'
            }
          ]
        }

        // Send push notification using simple HTTP request
        const success = await sendPushNotification(
          subscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        )

        if (success) {
          successCount++
        } else {
          failureCount++
        }

      } catch (error) {
        console.error('Error processing subscription:', subscription.id, error)
        failureCount++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        success: successCount,
        failure: failureCount,
        total: subscriptions.length
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
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
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

async function sendPushNotification(
  subscription: PushSubscription,
  payload: any,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    console.log('=== PUSH NOTIFICATION DEBUG ===')
    console.log('Endpoint:', subscription.endpoint)
    console.log('VAPID Public Key (first 20 chars):', vapidPublicKey.substring(0, 20))
    console.log('VAPID Private Key (first 20 chars):', vapidPrivateKey.substring(0, 20))
    
    const vapidToken = await createSimpleVapidToken(subscription.endpoint, vapidPrivateKey)
    console.log('Generated VAPID Token (first 50 chars):', vapidToken.substring(0, 50))
    
    const authHeader = `vapid t=${vapidToken}, k=${vapidPublicKey}`
    console.log('Authorization header (first 100 chars):', authHeader.substring(0, 100))
    
    // Try different approaches
    console.log('Trying approach 1: With VAPID auth')
    let response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'TTL': '86400'
      }
    })
    
    console.log('Approach 1 result:', response.status, response.statusText)
    
    if (!response.ok) {
      console.log('Trying approach 2: Without Authorization header')
      response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'TTL': '86400'
        }
      })
      console.log('Approach 2 result:', response.status, response.statusText)
    }
    
    if (!response.ok) {
      console.log('Trying approach 3: Minimal headers')
      response = await fetch(subscription.endpoint, {
        method: 'POST'
      })
      console.log('Approach 3 result:', response.status, response.statusText)
    }

    console.log('Final Push service response status:', response.status)
    console.log('Final Push service response statusText:', response.statusText)
    console.log('Final Push service response headers:', Object.fromEntries(response.headers.entries()))
    
    // Always get response text for debugging
    const responseText = await response.text()
    console.log('Push service response body:', responseText)
    
    if (response.ok) {
      console.log('✅ Push notification sent successfully!')
      return true
    } else {
      console.error('❌ Push notification failed')
      console.error('Response status:', response.status)
      console.error('Response text:', responseText)
      
      // Log specific error types
      if (response.status === 400) {
        console.error('Bad Request - Check VAPID headers or endpoint format')
      } else if (response.status === 401) {
        console.error('Unauthorized - VAPID authentication failed')
      } else if (response.status === 410) {
        console.error('Gone - Subscription is no longer valid')
      } else if (response.status === 413) {
        console.error('Payload Too Large')
      }
      
      return false
    }

  } catch (error) {
    console.error('❌ Exception in sendPushNotification:', error)
    return false
  }
}

async function createSimpleVapidToken(endpoint: string, vapidPrivateKey: string): Promise<string> {
  try {
    const url = new URL(endpoint)
    const audience = `${url.protocol}//${url.host}`
    
    // Create JWT header
    const header = {
      typ: 'JWT',
      alg: 'ES256'
    }
    
    // Create JWT payload
    const payload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 43200, // 12 hours
      sub: 'mailto:your-email@example.com'
    }
    
    // Create JWT without signing for now (simplified)
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    // For now, use a simple signature placeholder
    const signature = btoa('simple-signature').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    return `${headerB64}.${payloadB64}.${signature}`
  } catch (error) {
    console.error('Error creating VAPID token:', error)
    return 'fallback-token'
  }
}