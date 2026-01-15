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

    if (!aiApiKey) {
      throw new Error("API Key AI belum dikonfigurasi. Silakan konfigurasi di halaman Pengaturan.");
    }

    // Determine API URL and model based on provider
    let apiUrl = "";
    let model = "";

    if (aiProvider === "gemini") {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      model = "gemini-2.0-flash";
    } else if (aiProvider === "openai") {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      model = "gpt-4o-mini";
    } else if (aiProvider === "anthropic") {
      // Anthropic uses a different API format, we'll use their messages API
      apiUrl = "https://api.anthropic.com/v1/messages";
      model = "claude-3-haiku-20240307";
    } else {
      throw new Error("Provider AI tidak didukung. Gunakan gemini, openai, atau anthropic.");
    }

    const body: ChatRequest = await req.json();
    const { message, history = [] } = body;

    // Build messages array
    const messages = [
      { role: "system", content: TUTORIAL_SYSTEM_PROMPT },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    let responseData;

    if (aiProvider === "anthropic") {
      // Anthropic uses a different format
      const anthropicResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "x-api-key": aiApiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: TUTORIAL_SYSTEM_PROMPT,
          messages: [
            ...history.slice(-10).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
            { role: "user", content: message },
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        if (anthropicResponse.status === 429) {
          return new Response(
            JSON.stringify({
              error: "Terlalu banyak permintaan ke layanan AI. Silakan tunggu 30-60 detik lalu coba lagi.",
              code: 429,
              retry_after_seconds: 60,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const errorText = await anthropicResponse.text();
        console.error("Anthropic API error:", anthropicResponse.status, errorText);
        throw new Error("Gagal terhubung ke Anthropic API. Periksa API Key Anda.");
      }

      const anthropicData = await anthropicResponse.json();
      responseData = anthropicData.content?.[0]?.text || "";
    } else {
      // OpenAI-compatible format (Gemini and OpenAI)
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiApiKey}`,
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
            JSON.stringify({
              error: "Terlalu banyak permintaan ke layanan AI. Silakan tunggu 30-60 detik lalu coba lagi.",
              code: 429,
              retry_after_seconds: 60,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        throw new Error(`Gagal terhubung ke ${aiProvider.toUpperCase()} API. Periksa API Key Anda.`);
      }

      const data = await response.json();
      responseData = data.choices?.[0]?.message?.content || "";
    }

    return new Response(
      JSON.stringify({ response: responseData }),
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
