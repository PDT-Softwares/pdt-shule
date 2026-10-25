import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing auth header")

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("APP_SERVICE_ROLE_KEY") ?? ""
    )
    
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { email, full_name, school_id, role, class_id, stream_id, assignments } = await req.json()

    const { data: caller } = await supabaseAdmin
      .from("school_members")
      .select("role")
      .eq("school_id", school_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (caller?.role !== "admin") throw new Error("Only school admins can invite teachers")

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find((u: any) => u.email === email)

    if (existingUser) {
      const { data: existingMember } = await supabaseAdmin
        .from("school_members")
        .select("id")
        .eq("school_id", school_id)
        .eq("user_id", existingUser.id)
        .maybeSingle()
      if (existingMember) throw new Error("This email is already a member of this school")
    }

    let userId = existingUser?.id
    if (!existingUser) {
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name }
      })
      if (inviteErr) throw inviteErr
      userId = inviteData.user.id
    }

    const { error: memberErr } = await supabaseAdmin.from("school_members").insert({
      school_id,
      user_id: userId,
      role,
      class_id: role === 'classteacher' ? class_id : null,
      stream_id: role === 'classteacher' ? stream_id : null,
    })
    if (memberErr) throw memberErr

    if (Array.isArray(assignments) && assignments.length > 0) {
      const rows = []
      for (const a of assignments) {
        for (const subject_id of a.subject_ids) {
          rows.push({
            school_id,
            teacher_id: userId,
            class_id: a.class_id,
            stream_id: a.stream_id || null,
            subject_id,
          })
        }
      }
      const { error: subjErr } = await supabaseAdmin.from("teacher_subject_assignments").insert(rows)
      if (subjErr) throw subjErr
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})