import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  nim?: string;
  nip?: string;
  program?: string;
  class_group?: string;
  enrollment_year?: number;
  gender?: string;
  sistem_kuliah_id?: string;
}

interface BulkCreateRequest {
  action: "create";
  users: UserData[];
}

interface BulkDeleteRequest {
  action: "delete";
  user_ids: string[];
}

type RequestBody = BulkCreateRequest | BulkDeleteRequest;

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
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token from Bearer token
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT using admin client
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

    const body: RequestBody = await req.json();

    // Handle bulk create
    if (body.action === "create") {
      const { users } = body as BulkCreateRequest;
      
      if (!users || !Array.isArray(users) || users.length === 0) {
        return new Response(JSON.stringify({ error: "No users provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Limit batch size
      if (users.length > 100) {
        return new Response(JSON.stringify({ error: "Maximum 100 users per batch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sub-admin cannot create admin or sub_admin accounts
      if (adminProfile?.role === "sub_admin") {
        const hasAdminRole = users.some(u => u.role === "admin" || u.role === "sub_admin");
        if (hasAdminRole) {
          return new Response(JSON.stringify({ error: "Sub-admin cannot create admin accounts" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const results: { email: string; success: boolean; error?: string; userId?: string }[] = [];
      
      // Process all users in parallel with Promise.allSettled
      const promises = users.map(async (userData) => {
        try {
          // Validate required fields
          if (!userData.email || !userData.password || !userData.full_name || !userData.role) {
            return { email: userData.email, success: false, error: "Missing required fields" };
          }

          // Create user with admin API
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: { full_name: userData.full_name, role: userData.role },
          });

          if (createError) {
            return { email: userData.email, success: false, error: createError.message };
          }

          // Update profile with additional data
          await supabaseAdmin
            .from("profiles")
            .update({
              nim: userData.nim || null,
              nip: userData.nip || null,
              program: userData.program || null,
              class_group: userData.class_group || null,
              enrollment_year: userData.enrollment_year || null,
              gender: userData.gender || null,
              sistem_kuliah_id: userData.sistem_kuliah_id || null,
            })
            .eq("id", newUser.user.id);

          return { email: userData.email, success: true, userId: newUser.user.id };
        } catch (err: any) {
          return { email: userData.email, success: false, error: err.message || "Unknown error" };
        }
      });

      const settledResults = await Promise.allSettled(promises);
      
      for (const result of settledResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({ email: "unknown", success: false, error: result.reason?.message || "Unknown error" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return new Response(JSON.stringify({ 
        success: true, 
        created: successCount,
        failed: failCount,
        results 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle bulk delete
    if (body.action === "delete") {
      const { user_ids } = body as BulkDeleteRequest;
      
      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ error: "No user IDs provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Limit batch size
      if (user_ids.length > 100) {
        return new Response(JSON.stringify({ error: "Maximum 100 users per batch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Don't allow deleting self
      if (user_ids.includes(requestingUser.id)) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if sub_admin is trying to delete admin accounts
      if (adminProfile?.role === "sub_admin") {
        const { data: profilesToDelete } = await supabaseAdmin
          .from("profiles")
          .select("id, role")
          .in("id", user_ids);
        
        const hasAdminUsers = profilesToDelete?.some(p => p.role === "admin" || p.role === "sub_admin");
        if (hasAdminUsers) {
          return new Response(JSON.stringify({ error: "Sub-admin cannot delete admin accounts" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const results: { userId: string; success: boolean; error?: string }[] = [];
      
      // Process all deletions in parallel
      const promises = user_ids.map(async (userId) => {
        try {
          // First try to delete from auth.users (this will cascade to profiles if FK exists)
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          
          // If auth user doesn't exist, still try to delete from profiles directly
          // This handles cases where profiles were created without auth entries
          if (authDeleteError?.message?.includes("not found") || authDeleteError?.message?.includes("User not found")) {
            // Delete from user_roles first
            await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
            
            // Delete from profiles
            const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
            
            if (profileError) {
              return { userId, success: false, error: profileError.message };
            }
            return { userId, success: true };
          }
          
          if (authDeleteError) {
            return { userId, success: false, error: authDeleteError.message };
          }
          
          return { userId, success: true };
        } catch (err: any) {
          return { userId, success: false, error: err.message || "Unknown error" };
        }
      });

      const settledResults = await Promise.allSettled(promises);
      
      for (const result of settledResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({ userId: "unknown", success: false, error: result.reason?.message || "Unknown error" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return new Response(JSON.stringify({ 
        success: true, 
        deleted: successCount,
        failed: failCount,
        results 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
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
