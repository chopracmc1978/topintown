import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub as string

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for user management
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { action, ...data } = await req.json()
    console.log('User management action:', action, data)

    switch (action) {
      case 'create': {
        const { email, password, username, fullName, role, locationId } = data

        // Create user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username: username?.toLowerCase() }
        })

        if (createError) {
          console.error('Create user error:', createError)
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update profile with username and location
        if (newUser.user) {
          await adminClient
            .from('profiles')
            .update({ 
              username: username?.toLowerCase(), 
              full_name: fullName,
              location_id: locationId || null
            })
            .eq('user_id', newUser.user.id)

          // Add role if specified
          if (role && role !== 'user') {
            await adminClient
              .from('user_roles')
              .insert({ user_id: newUser.user.id, role })
          }
        }

        return new Response(
          JSON.stringify({ success: true, user: newUser.user }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        const { targetUserId } = data

        // Prevent self-deletion
        if (targetUserId === userId) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)

        if (deleteError) {
          console.error('Delete user error:', deleteError)
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        const { targetUserId, email, password, fullName, username } = data

        // Update auth user if email/password changed
        if (email || password) {
          const updateData: { email?: string; password?: string } = {}
          if (email) updateData.email = email
          if (password) updateData.password = password

          const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, updateData)
          if (authError) {
            console.error('Update auth error:', authError)
            return new Response(
              JSON.stringify({ error: authError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        // Update profile
        const profileUpdate: { full_name?: string; username?: string } = {}
        if (fullName !== undefined) profileUpdate.full_name = fullName
        if (username !== undefined) profileUpdate.username = username?.toLowerCase()

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await adminClient
            .from('profiles')
            .update(profileUpdate)
            .eq('user_id', targetUserId)

          if (profileError) {
            console.error('Update profile error:', profileError)
            return new Response(
              JSON.stringify({ error: profileError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: unknown) {
    console.error('User management error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
