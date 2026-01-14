import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TUTORIAL_SYSTEM_PROMPT = `Anda adalah asisten tutorial untuk aplikasi web Student Achievement Tracker (E-Learning).
Tugas Anda adalah membantu pengguna memahami cara mengoperasikan dan menggunakan fitur-fitur dalam aplikasi ini.

Aplikasi ini memiliki fitur-fitur berikut:

1. **Dashboard** - Halaman utama yang menampilkan ringkasan data dan statistik
   - Admin: Kelola pengguna, kelola kelas, penugasan dosen, import/export data
   - Dosen: Lihat kelas yang diampu, statistik mahasiswa
   - Mahasiswa: Lihat nilai dan progress pembelajaran

2. **E-Learning** - Sistem pembelajaran online
   - Materi: Akses materi pembelajaran, H5P content, embedded quiz
   - Quiz: Mengerjakan quiz dan melihat hasil
   - Presensi: Melakukan presensi kehadiran
   - Penugasan: Mengumpulkan tugas

3. **Mata Kuliah** - Kelola mata kuliah dan capaian pembelajaran
   - CLO (Course Learning Outcomes)
   - LLO (Lesson Learning Outcomes)
   - Asesmen dan penilaian

4. **Kurikulum** - Kelola struktur kurikulum
   - PLO (Program Learning Outcomes)
   - Profil lulusan
   - Pemetaan capaian

5. **Pengaturan** - Konfigurasi sistem
   - Tema dan tampilan aplikasi
   - API Key untuk AI
   - Kurikulum dan program studi
   - Instrumen penilaian
   - Hak akses role

Aturan menjawab:
- Jawab HANYA pertanyaan tentang tutorial dan cara menggunakan aplikasi ini
- Jika pertanyaan di luar topik tutorial aplikasi, tolak dengan sopan dan arahkan kembali
- Gunakan bahasa Indonesia yang baik dan ramah
- Berikan langkah-langkah yang jelas dan terstruktur
- Jawaban singkat dan to the point`;

interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client to fetch settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch AI settings from app_settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["ai_api_key", "ai_provider"]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { setting_key: string; setting_value: string | null }) => {
      settings[s.setting_key] = s.setting_value || "";
    });

    const aiApiKey = settings["ai_api_key"];
    const aiProvider = settings["ai_provider"] || "gemini";

    // Determine which API to use based on provider and API key availability
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKeyToUse = LOVABLE_API_KEY;
    let model = "google/gemini-2.5-flash";

    // If user has configured their own API key, use the appropriate provider
    if (aiApiKey) {
      if (aiProvider === "gemini") {
        apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        apiKeyToUse = aiApiKey;
        model = "gemini-2.0-flash";
      } else if (aiProvider === "openai") {
        apiUrl = "https://api.openai.com/v1/chat/completions";
        apiKeyToUse = aiApiKey;
        model = "gpt-4o-mini";
      } else if (aiProvider === "anthropic") {
        // For Anthropic, we'll use the Lovable gateway as fallback since direct API is different
        apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
        apiKeyToUse = LOVABLE_API_KEY;
        model = "google/gemini-2.5-flash";
      }
    }

    if (!apiKeyToUse) {
      throw new Error("No AI API key configured. Please configure it in Settings or contact admin.");
    }

    const body: ChatRequest = await req.json();
    const { message, history = [] } = body;

    // Build messages array
    const messages = [
      { role: "system", content: TUTORIAL_SYSTEM_PROMPT },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKeyToUse}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      // If custom API key fails, try fallback to Lovable API
      if (aiApiKey && LOVABLE_API_KEY) {
        console.log("Falling back to Lovable AI Gateway...");
        const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages,
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const content = fallbackData.choices?.[0]?.message?.content || "";
          return new Response(
            JSON.stringify({ response: content }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      throw new Error("AI API error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ response: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in tutorial-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
