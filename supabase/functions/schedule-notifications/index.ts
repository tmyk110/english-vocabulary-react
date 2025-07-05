import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current time in JST (UTC+9)
    const now = new Date()
    // Create JST time using toLocaleString to handle timezone properly
    const jstTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}))
    const currentHour = jstTime.getHours()
    const currentMinute = jstTime.getMinutes()
    const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`
    
    console.log(`Checking for notifications at JST time: ${currentTimeString}`)

    // Get users who should receive notifications at this time
    const { data: usersToNotify, error: usersError } = await supabaseClient
      .from('notification_settings')
      .select(`
        user_id,
        notification_time,
        fcm_tokens!inner(
          id,
          token,
          is_active
        )
      `)
      .eq('is_enabled', true)
      .eq('notification_time', currentTimeString)
      .eq('fcm_tokens.is_active', true)

    if (usersError) {
      console.error('Error fetching users to notify:', usersError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch users for notifications',
          details: usersError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!usersToNotify || usersToNotify.length === 0) {
      console.log(`No users scheduled for notification at ${currentTimeString}`)
      return new Response(
        JSON.stringify({
          message: 'No users scheduled for notification at this time',
          currentTime: currentTimeString,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    console.log(`Found ${usersToNotify.length} users scheduled for notification at ${currentTimeString}`)

    // Call the send-fcm-notification function for scheduled notifications
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-fcm-notification`
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        scheduled: true,
        targetTime: currentTimeString
      })
    })

    const result = await response.json()

    // Log the result for monitoring
    console.log('Scheduled notification result:', result)

    return new Response(
      JSON.stringify({
        message: 'Scheduled notifications executed',
        targetTime: currentTimeString,
        usersFound: usersToNotify.length,
        timestamp: new Date().toISOString(),
        result: result
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in schedule-notifications function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})