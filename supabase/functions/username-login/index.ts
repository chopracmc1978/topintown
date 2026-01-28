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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables')
      return json(500, { error: 'Server misconfiguration' })
    }

    const body = await req.json().catch(() => ({}))
    const rawIdentifier = typeof body?.username === 'string' ? body.username : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    const identifier = rawIdentifier.trim().toLowerCase()

    if (!identifier || !password) {
      return json(400, { error: 'Username/email and password are required' })
    }

    // Client for performing auth sign-in
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let email = identifier

    // Username path: resolve username -> email using service role
    if (!identifier.includes('@')) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('email')
        .eq('username', identifier)
        .maybeSingle()

      if (profileError || !profile?.email) {
        // Avoid user enumeration
        return json(400, { error: 'Invalid username/email or password' })
      }

      email = profile.email
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data?.session) {
      return json(400, { error: 'Invalid username/email or password' })
    }

    // Best-effort: ensure a profiles row exists so future username logins can resolve username -> email.
    // (Do not fail login if this step fails.)
    try {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const metadataUsername = (data.user?.user_metadata as any)?.username
      const normalizedMetadataUsername = typeof metadataUsername === 'string'
        ? metadataUsername.trim().toLowerCase()
        : null

      const usernameToStore = identifier.includes('@') ? normalizedMetadataUsername : identifier

      await adminClient
        .from('profiles')
        .upsert(
          {
            user_id: data.user.id,
            email,
            username: usernameToStore,
          },
          { onConflict: 'user_id' }
        )
    } catch (profileUpsertError) {
      console.error('username-login: profile upsert failed', profileUpsertError)
    }

    return json(200, { session: data.session, user: data.user })
  } catch (err) {
    console.error('username-login error:', err)
    return json(500, { error: 'Unexpected error' })
  }
})
