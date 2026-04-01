import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use Lovable AI Gateway - LOVABLE_API_KEY is auto-provisioned
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY tidak tersedia.");
    }
    const { message, history = [] } = body;

    // Build messages array
    const messages = [
      { role: "system", content: TUTORIAL_SYSTEM_PROMPT },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Terlalu banyak permintaan. Silakan tunggu beberapa detik lalu coba lagi.",
            code: 429,
            retry_after_seconds: 10,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Kredit AI habis. Silakan hubungi administrator.",
            code: 402,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error("Gagal terhubung ke layanan AI.");
    }

    const data = await response.json();
    const responseData = data.choices?.[0]?.message?.content || "";

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
