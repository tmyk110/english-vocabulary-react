import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('Check-subscriptions called:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
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

    // Get all push subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')

    if (subscriptionError) {
      console.error('Error fetching subscriptions:', subscriptionError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions', details: subscriptionError }),
        { 
          status: 500, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Get all users with vocabulary words
    const { data: users, error: usersError } = await supabaseClient
      .from('vocabulary_words')
      .select('user_id')
      .neq('user_id', null)

    console.log('Subscriptions found:', subscriptions)
    console.log('Users with words found:', users)

    return new Response(
      JSON.stringify({
        message: 'Subscription check completed',
        subscriptions: subscriptions || [],
        subscriptionCount: subscriptions?.length || 0,
        activeSubscriptions: subscriptions?.filter(s => s.is_active) || [],
        activeSubscriptionCount: subscriptions?.filter(s => s.is_active).length || 0,
        usersWithWords: users || [],
        userCount: users?.length || 0,
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
    console.error('Error in check-subscriptions function:', error)
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