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
  user_id: string
}

serve(async (req) => {
  console.log('Send-push-webpush called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Check environment variables first
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

    // Try to import and use web-push library
    let webpush: any
    try {
      console.log('Attempting to import web-push library...')
      webpush = await import('https://esm.sh/web-push@3.6.7')
      console.log('Web-push library imported:', !!webpush)
      console.log('Available methods:', Object.keys(webpush))
      
      if (webpush.default) {
        console.log('Using webpush.default')
        console.log('Default methods:', Object.keys(webpush.default))
        webpush = webpush.default
      }
    } catch (importError) {
      console.error('Failed to import web-push library:', importError)
      return new Response(
        JSON.stringify({ error: 'Failed to import web-push library', details: importError.message }),
        { 
          status: 500, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Set VAPID details
    try {
      console.log('Setting VAPID details...')
      webpush.setVapidDetails(
        'mailto:your-email@example.com',
        vapidPublicKey,
        vapidPrivateKey
      )
      console.log('VAPID details set successfully')
    } catch (vapidError) {
      console.error('Failed to set VAPID details:', vapidError)
      return new Response(
        JSON.stringify({ error: 'Failed to set VAPID details', details: vapidError.message }),
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
        console.log('Processing subscription for user:', subscription.user_id)

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

        // Prepare notification payload
        const payload = JSON.stringify({
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
        })

        // Convert base64 keys back to proper format
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        }

        console.log('Sending push notification with web-push library...')
        console.log('Endpoint:', subscription.endpoint)
        console.log('Payload length:', payload.length)

        // Send notification using web-push library
        const result = await webpush.sendNotification(pushSubscription, payload)
        
        console.log('Web-push result:', result)
        successCount++

      } catch (error) {
        console.error('Error processing subscription:', subscription.id, error)
        
        // If it's a 410 error (subscription expired), mark as inactive
        if (error.statusCode === 410) {
          console.log('Marking subscription as inactive due to 410 error')
          await supabaseClient
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id)
        }
        
        failureCount++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent via web-push',
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
    console.error('Error in send-push-webpush function:', error)
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