import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    console.log("[admin-sync-profiles] Starting sync...");

    // Fetch all auth users (paginated)
    const allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error("[admin-sync-profiles] Error listing users:", listError);
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!usersPage?.users || usersPage.users.length === 0) {
        break;
      }

      allAuthUsers.push(...usersPage.users);

      if (usersPage.users.length < perPage) {
        break;
      }
      page++;
    }

    console.log(`[admin-sync-profiles] Found ${allAuthUsers.length} auth users`);

    // Fetch all existing profile IDs
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id");

    if (profilesError) {
      console.error("[admin-sync-profiles] Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingProfileIds = new Set((existingProfiles || []).map((p) => p.id));

    // Find auth users without profiles
    const usersWithoutProfiles = allAuthUsers.filter((u) => !existingProfileIds.has(u.id));

    console.log(`[admin-sync-profiles] Found ${usersWithoutProfiles.length} users without profiles`);

    if (usersWithoutProfiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Semua user sudah memiliki profil",
          synced: 0,
          failed: 0,
          details: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create profiles for users without them
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const authUser of usersWithoutProfiles) {
      const email = authUser.email || "";
      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        email.split("@")[0] ||
        "User";
      // Never trust user_metadata.role — mirrors handle_new_user trigger
      const role = "mahasiswa";

      try {
        // Insert profile
        const { error: insertProfileError } = await supabaseAdmin.from("profiles").insert({
          id: authUser.id,
          email: email,
          full_name: fullName,
          role: role,
        });

        if (insertProfileError) {
          console.warn(`[admin-sync-profiles] Failed to create profile for ${email}:`, insertProfileError.message);
          results.push({ email, success: false, error: insertProfileError.message });
          continue;
        }

        // Insert user_roles
        const { error: insertRoleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: authUser.id,
          role: role,
        });

        if (insertRoleError) {
          // Profile created but role failed - log warning but consider success
          console.warn(`[admin-sync-profiles] Profile created but user_roles failed for ${email}:`, insertRoleError.message);
        }

        console.log(`[admin-sync-profiles] Synced profile for ${email}`);
        results.push({ email, success: true });
      } catch (err: any) {
        console.error(`[admin-sync-profiles] Error syncing ${email}:`, err);
        results.push({ email, success: false, error: err?.message || "Unknown error" });
      }
    }

    const syncedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`[admin-sync-profiles] Done. Synced=${syncedCount}, Failed=${failedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Berhasil sinkronisasi ${syncedCount} profil${failedCount > 0 ? `, ${failedCount} gagal` : ""}`,
        synced: syncedCount,
        failed: failedCount,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[admin-sync-profiles] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
