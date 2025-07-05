import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Send-push-working called:', req.method)
  
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
        // Get user's vocabulary words
        const { data: words } = await supabaseClient
          .from('vocabulary_words')
          .select('*')
          .eq('user_id', subscription.user_id)

        if (!words || words.length === 0) continue

        const randomWord = words[Math.floor(Math.random() * words.length)]

        // Detailed subscription analysis
        console.log('=== SUBSCRIPTION ANALYSIS ===')
        console.log('User ID:', subscription.user_id)
        console.log('Endpoint:', subscription.endpoint)
        console.log('Endpoint host:', new URL(subscription.endpoint).host)
        console.log('P256DH Key (first 20 chars):', subscription.p256dh_key?.substring(0, 20))
        console.log('Auth Key (first 20 chars):', subscription.auth_key?.substring(0, 20))
        console.log('Is Active:', subscription.is_active)
        console.log('Created At:', subscription.created_at)
        console.log('User Agent:', subscription.user_agent)
        
        // Try to send notification with proper FCM headers
        console.log('Attempting to send notification to FCM...')
        
        // For FCM, we need Authorization header with the server key
        // But first, let's try with VAPID authentication
        const vapidHeader = `vapid t=${createSimpleJWT(subscription.endpoint, vapidPrivateKey)}, k=${vapidPublicKey}`
        
        console.log('Using VAPID auth for FCM')
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': vapidHeader,
            'TTL': '60'
          }
        })

        const responseText = await response.text()
        console.log('Response status:', response.status)
        console.log('Response headers:', Object.fromEntries(response.headers.entries()))
        console.log('Response text:', responseText)
        
        if (response.ok || response.status === 204) {
          console.log('✅ Notification sent successfully')
          successCount++
        } else {
          console.log('❌ Notification failed')
          
          // If subscription is gone (410), mark as inactive
          if (response.status === 410) {
            console.log('Marking subscription as inactive due to 410 error')
            await supabaseClient
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', subscription.id)
          }
          
          failureCount++
        }

      } catch (error) {
        console.error('Error processing subscription:', error)
        failureCount++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Working push test completed',
        success: successCount,
        failure: failureCount,
        total: subscriptions.length,
        note: 'This sends empty notifications to test basic connectivity'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push-working function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function createSimpleJWT(endpoint: string, vapidPrivateKey: string): string {
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
    
    // Create unsigned JWT (for testing)
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    // Simple signature (not cryptographically secure, but might work for testing)
    const signature = btoa('test-signature').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    return `${headerB64}.${payloadB64}.${signature}`
  } catch (error) {
    console.error('Error creating JWT:', error)
    return 'fallback-token'
  }
}