import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Send-push-final called:', req.method)
  
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

    for (const subscription of subscriptions) {
      try {
        console.log('=== FINAL PUSH TEST ===')
        console.log('Endpoint:', subscription.endpoint)
        
        // Get user's vocabulary words
        const { data: words } = await supabaseClient
          .from('vocabulary_words')
          .select('*')
          .eq('user_id', subscription.user_id)

        if (!words || words.length === 0) continue

        const randomWord = words[Math.floor(Math.random() * words.length)]

        // Create notification payload
        const payload = JSON.stringify({
          title: '英単語学習リマインダー',
          body: `「${randomWord.word}」の意味は覚えていますか？`,
          icon: '/logo192.png',
          tag: 'vocabulary-notification'
        })

        console.log('Payload:', payload)

        // For FCM, try different approaches
        const results = []

        // Approach 1: With payload and VAPID
        console.log('Approach 1: With payload and VAPID')
        try {
          const response1 = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `vapid t=${createVapidJWT(subscription.endpoint, vapidPrivateKey)}, k=${vapidPublicKey}`,
              'Content-Type': 'application/octet-stream',
              'TTL': '86400'
            },
            body: new TextEncoder().encode(payload)
          })
          
          const text1 = await response1.text()
          results.push({ approach: 'VAPID + Payload', status: response1.status, response: text1 })
          console.log('Approach 1 result:', response1.status, text1)
          
          if (response1.ok) {
            successCount++
            break // Success, no need to try other approaches
          }
        } catch (e1) {
          results.push({ approach: 'VAPID + Payload', error: e1.message })
        }

        // Approach 2: Just VAPID without payload
        console.log('Approach 2: VAPID only')
        try {
          const response2 = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `vapid t=${createVapidJWT(subscription.endpoint, vapidPrivateKey)}, k=${vapidPublicKey}`,
              'TTL': '86400'
            }
          })
          
          const text2 = await response2.text()
          results.push({ approach: 'VAPID Only', status: response2.status, response: text2 })
          console.log('Approach 2 result:', response2.status, text2)
          
          if (response2.ok) {
            successCount++
            break
          }
        } catch (e2) {
          results.push({ approach: 'VAPID Only', error: e2.message })
        }

        // Approach 3: Minimal request
        console.log('Approach 3: Minimal')
        try {
          const response3 = await fetch(subscription.endpoint, {
            method: 'POST'
          })
          
          const text3 = await response3.text()
          results.push({ approach: 'Minimal', status: response3.status, response: text3 })
          console.log('Approach 3 result:', response3.status, text3)
          
          if (response3.ok) {
            successCount++
            break
          }
        } catch (e3) {
          results.push({ approach: 'Minimal', error: e3.message })
        }

        console.log('All approaches failed for this subscription')
        console.log('Results:', results)
        failureCount++

      } catch (error) {
        console.error('Error processing subscription:', error)
        failureCount++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Final push test completed',
        success: successCount,
        failure: failureCount,
        total: subscriptions.length,
        note: 'Tried multiple approaches with detailed logging'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push-final function:', error)
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