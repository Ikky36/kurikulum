import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No Authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token from Bearer token
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT using admin client
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    console.log("Auth check:", { hasUser: !!requestingUser, error: authError?.message });
    
    if (authError || !requestingUser) {
      console.log("Auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requesting user is admin
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", requestingUser.id)
      .single();

    if (adminProfile?.role !== "admin" && adminProfile?.role !== "sub_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { email, password, full_name, role, roles, nim, nip, program, class_group, enrollment_year, gender } = await req.json();

    // Sub-admin cannot create admin or sub_admin accounts
    const requestedRoles: string[] = Array.isArray(roles) ? roles : (role ? [role] : []);
    
    if (adminProfile?.role === "sub_admin") {
      if (requestedRoles.includes("admin") || requestedRoles.includes("sub_admin")) {
        return new Response(JSON.stringify({ error: "Forbidden: Sub-admin cannot create admin accounts" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Support both single role and multiple roles
    const userRoles: string[] = Array.isArray(roles) ? roles : (role ? [role] : ['mahasiswa']);

    if (!email || !password || !full_name || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Determine primary role (highest privilege)
    let primaryRole = 'mahasiswa';
    if (userRoles.includes('admin')) primaryRole = 'admin';
    else if (userRoles.includes('sub_admin')) primaryRole = 'sub_admin';
    else if (userRoles.includes('dosen')) primaryRole = 'dosen';
    else if (userRoles.includes('mahasiswa')) primaryRole = 'mahasiswa';

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: `Email ${email} sudah terdaftar dalam sistem` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: primaryRole },
    });

    if (createError) {
      // Provide user-friendly error messages
      let errorMessage = createError.message;
      if (createError.message.includes("already been registered")) {
        errorMessage = `Email ${email} sudah terdaftar dalam sistem`;
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with additional data
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        nim: nim || null,
        nip: nip || null,
        program: program || null,
        class_group: class_group || null,
        enrollment_year: enrollment_year || null,
        gender: gender || null,
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
    }

    // Insert additional roles into user_roles table (trigger already inserts primary role)
    if (userRoles.length > 0) {
      const rolesToInsert = userRoles.map((r: string) => ({ 
        user_id: newUser.user.id, 
        role: r 
      }));
      
      // Use upsert to avoid duplicate key errors (handle_new_user trigger may have already inserted primary role)
      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .upsert(rolesToInsert, { onConflict: 'user_id,role', ignoreDuplicates: true });
      
      if (rolesError) {
        console.error("User roles insert error:", rolesError);
      }
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
