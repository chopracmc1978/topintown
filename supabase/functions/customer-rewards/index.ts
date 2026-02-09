import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables')
      return json(500, { error: 'Server misconfiguration' })
    }

    const body = await req.json().catch(() => ({}))
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const customerId = typeof body?.customerId === 'string' ? body.customerId.trim() : ''
    const includeHistory = body?.includeHistory === true

    // Validate: need at least phone or customerId
    if (!phone && !customerId) {
      return json(400, { error: 'Phone or customerId is required' })
    }

    // Validate phone format (digits only, 3-20 chars)
    if (phone && (!/^\d{3,20}$/.test(phone))) {
      return json(400, { error: 'Invalid phone format' })
    }

    // Validate customerId format (UUID)
    if (customerId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return json(400, { error: 'Invalid customerId format' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch rewards
    let rewardsQuery = supabase
      .from('customer_rewards')
      .select('id, phone, points, lifetime_points, customer_id, created_at, updated_at')

    if (phone) {
      rewardsQuery = rewardsQuery.eq('phone', phone)
    } else {
      rewardsQuery = rewardsQuery.eq('customer_id', customerId)
    }

    const { data: rewards, error: rewardsError } = await rewardsQuery.maybeSingle()

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError)
      return json(500, { error: 'Failed to fetch rewards' })
    }

    // Optionally fetch history
    let history = null
    if (includeHistory && (phone || rewards?.phone)) {
      const lookupPhone = phone || rewards?.phone
      const { data: historyData, error: historyError } = await supabase
        .from('rewards_history')
        .select('id, phone, order_id, points_change, transaction_type, description, created_at')
        .eq('phone', lookupPhone)
        .order('created_at', { ascending: false })
        .limit(50)

      if (historyError) {
        console.error('Error fetching rewards history:', historyError)
        // Non-fatal: return rewards without history
      } else {
        history = historyData
      }
    }

    console.log(`customer-rewards: fetched for ${phone || customerId}, points=${rewards?.points ?? 0}`)

    return json(200, { rewards: rewards || null, history })
  } catch (err) {
    console.error('customer-rewards error:', err)
    return json(500, { error: 'Unexpected error' })
  }
})
