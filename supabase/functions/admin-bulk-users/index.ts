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
  updateIfExists?: boolean;
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
      const { users, updateIfExists = false } = body as BulkCreateRequest;
      
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

      console.log(`[admin-bulk-users] action=create users=${users.length} updateIfExists=${updateIfExists}`);

      const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const isRetryableAuthError = (err: any) => {
        const status = Number(err?.status || err?.code || 0);
        const msg = String(err?.message || "").toLowerCase();
        // Typical transient cases: rate limiting / upstream / network-ish errors
        return status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || msg.includes("rate") || msg.includes("timeout");
      };

      const withRetry = async <T>(fn: () => Promise<T>, label: string, email: string, maxAttempts = 3): Promise<T> => {
        let attempt = 0;
        // Exponential backoff: 250ms, 750ms, 1750ms...
        const delays = [250, 750, 1750, 3000];
        while (true) {
          attempt++;
          try {
            return await fn();
          } catch (e: any) {
            const retryable = isRetryableAuthError(e);
            if (!retryable || attempt >= maxAttempts) {
              console.warn(`[admin-bulk-users] ${label} failed email=${email} attempt=${attempt}/${maxAttempts} status=${e?.status} message=${e?.message}`);
              throw e;
            }
            const delay = delays[Math.min(attempt - 1, delays.length - 1)];
            console.warn(`[admin-bulk-users] ${label} retrying email=${email} attempt=${attempt}/${maxAttempts} in ${delay}ms (status=${e?.status} msg=${e?.message})`);
            await sleep(delay);
          }
        }
      };

      const isAlreadyExistsError = (err: any) => {
        const status = Number(err?.status || 0);
        const msg = String(err?.message || "").toLowerCase();
        return (
          msg.includes("already") ||
          msg.includes("registered") ||
          msg.includes("exists") ||
          msg.includes("duplicate") ||
          msg.includes("users_email_key") ||
          status === 409
        );
      };

      const updateProfileById = async (profileId: string, userData: UserData) => {
        return await supabaseAdmin
          .from("profiles")
          .update({
            full_name: userData.full_name,
            role: userData.role as any,
            nim: userData.nim || null,
            nip: userData.nip || null,
            program: userData.program || null,
            class_group: userData.class_group || null,
            enrollment_year: userData.enrollment_year || null,
            gender: userData.gender || null,
            sistem_kuliah_id: userData.sistem_kuliah_id || null,
          })
          .eq("id", profileId);
      };

      const findProfileIdByEmail = async (email: string) => {
        const { data, error } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .maybeSingle();

        if (error) return { id: null as string | null, error };
        return { id: data?.id ?? null, error: null };
      };

      const processUser = async (userData: UserData) => {
        const email = normalizeEmail(userData.email);
        const password = String(userData.password || "").trim();

        if (!email || !userData.full_name || !userData.role) {
          return { email, success: false, error: "Missing required fields" };
        }

        // If update is allowed and password is blank, try update-only flow.
        // This avoids intermittent failures when admin API requires password for creation.
        if (updateIfExists && !password) {
          const { id: existingId, error: findErr } = await findProfileIdByEmail(email);
          if (findErr) {
            return { email, success: false, error: findErr.message };
          }
          if (!existingId) {
            return { email, success: false, error: "Password wajib untuk akun baru" };
          }

          const { error: updateError } = await updateProfileById(existingId, userData);
          if (updateError) {
            return { email, success: false, error: updateError.message };
          }

          return { email, success: true, userId: existingId, action: "updated" };
        }

        const { data: newUser, error: createError }: any = await withRetry(
          () =>
            supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { full_name: userData.full_name, role: userData.role },
            }),
          "createUser",
          email,
          3
        ).catch((e) => {
          // Normalize to match the { data, error } shape used by supabase-js.
          return { data: null, error: e };
        });

        const alreadyExists = !!createError && isAlreadyExistsError(createError);

        if (createError) {
          console.warn(
            `[admin-bulk-users] createUser failed email=${email} status=${(createError as any)?.status} message=${createError.message}`
          );
        }

        if (createError && alreadyExists && updateIfExists) {
          const { id: existingId, error: findErr } = await findProfileIdByEmail(email);
          if (findErr) {
            console.warn(`[admin-bulk-users] findProfileIdByEmail failed email=${email}: ${findErr.message}`);
            return { email, success: false, error: findErr.message };
          }

          if (!existingId) {
            // Most common cause: the user exists in auth but profile row is missing.
            // We cannot reliably map email -> auth user id without scanning auth users,
            // so we return a clear error.
            return { email, success: false, error: "Email sudah terdaftar tetapi profil tidak ditemukan. Hubungi admin untuk sinkronisasi profil." };
          }

          const { error: updateError } = await updateProfileById(existingId, userData);
          if (updateError) {
            console.warn(`[admin-bulk-users] updateProfile failed email=${email}: ${updateError.message}`);
            return { email, success: false, error: updateError.message };
          }

          // Optionally update password
          if (password) {
            const { error: passErr } = await withRetry(
              () => supabaseAdmin.auth.admin.updateUserById(existingId, { password }),
              "updateUserById(password)",
              email,
              3
            ).catch((e) => ({ error: e } as any));

            if (passErr) {
              console.warn(`[admin-bulk-users] failed to update password for ${email}: ${passErr.message}`);
            }
          }

          return { email, success: true, userId: existingId, action: "updated" };
        }

        if (createError) {
          return { email, success: false, error: createError.message };
        }

        // Update profile with additional data (user already created in auth)
        const { error: profileUpdateError } = await supabaseAdmin
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

        if (profileUpdateError) {
          return { email, success: false, error: profileUpdateError.message };
        }

        return { email, success: true, userId: newUser.user.id, action: "created" };
      };

      const mapWithConcurrency = async <T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> => {
        const results: R[] = new Array(items.length);
        let nextIndex = 0;
        const workers = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
          while (true) {
            const current = nextIndex++;
            if (current >= items.length) break;
            results[current] = await mapper(items[current]);
          }
        });
        await Promise.all(workers);
        return results;
      };

      const results: { email: string; success: boolean; error?: string; userId?: string; action?: string }[] =
        await mapWithConcurrency(users, 4, async (userData) => {
          try {
            return await processUser(userData);
          } catch (err: any) {
            console.error("[admin-bulk-users] processUser error:", err);
            return { email: normalizeEmail((userData as any)?.email), success: false, error: err?.message || "Unknown error" };
          }
        });

      const createdCount = results.filter((r) => r.success && r.action === "created").length;
      const updatedCount = results.filter((r) => r.success && r.action === "updated").length;
      const failCount = results.filter((r) => !r.success).length;

      console.log(`[admin-bulk-users] done created=${createdCount} updated=${updatedCount} failed=${failCount}`);

      return new Response(
        JSON.stringify({
          success: true,
          created: createdCount,
          updated: updatedCount,
          failed: failCount,
          results,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
