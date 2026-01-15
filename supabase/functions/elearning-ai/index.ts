import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIRequest {
  type: "generate_material" | "generate_quiz" | "grade_answer" | "generate_feedback";
  context?: string;
  topic?: string;
  indicators?: string[];
  questionType?: string;
  questionCount?: number;
  studentAnswer?: string;
  correctAnswer?: string;
  questionText?: string;
  languageMode?: 'arabic' | 'indonesian' | 'mixed';
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
      .in("setting_key", ["ai_api_key", "ai_provider", "use_lovable_gateway"]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { setting_key: string; setting_value: string | null }) => {
      settings[s.setting_key] = s.setting_value || "";
    });

    // Check if we should use Lovable Gateway (default: true)
    const useLovableGateway = settings["use_lovable_gateway"] !== "false";
    
    let apiUrl = "";
    let model = "";
    let aiApiKey = "";
    let aiProvider = "";

    if (useLovableGateway) {
      // Use Lovable AI Gateway
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) {
        throw new Error("LOVABLE_API_KEY tidak tersedia. Pastikan Lovable Cloud sudah aktif.");
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      model = "google/gemini-3-flash-preview";
      aiApiKey = lovableApiKey;
      aiProvider = "lovable";
    } else {
      // Use custom API key from environment or settings
      const envGeminiKey = Deno.env.get("GEMINI_API_KEY");
      aiApiKey = envGeminiKey || settings["ai_api_key"];
      aiProvider = envGeminiKey ? "gemini" : (settings["ai_provider"] || "gemini");

      if (!aiApiKey) {
        throw new Error("API Key AI belum dikonfigurasi. Konfigurasi di halaman Pengaturan atau aktifkan Lovable Gateway.");
      }

      // Determine API URL and model based on provider
      if (aiProvider === "gemini") {
        apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        model = "gemini-2.0-flash";
      } else if (aiProvider === "openai") {
        apiUrl = "https://api.openai.com/v1/chat/completions";
        model = "gpt-4o-mini";
      } else if (aiProvider === "anthropic") {
        apiUrl = "https://api.anthropic.com/v1/messages";
        model = "claude-3-haiku-20240307";
      } else {
        throw new Error("Provider AI tidak didukung. Gunakan gemini, openai, atau anthropic.");
      }
    }

    const body: AIRequest = await req.json();
    const { type, context, topic, indicators, questionType, questionCount, studentAnswer, correctAnswer, questionText, languageMode } = body;

    // Language instructions based on mode
    let languageInstruction = '';
    switch (languageMode) {
      case 'arabic':
        languageInstruction = `PENTING - BAHASA OUTPUT:
- Gunakan bahasa Arab SEPENUHNYA untuk semua konten
- Semua teks Arab WAJIB menggunakan harakat lengkap (fathah, kasrah, dhammah, sukun, tanwin, tasydid, dll)
- Contoh format yang benar: "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِيْنَ" (dengan harakat lengkap)
- Jangan gunakan bahasa Indonesia sama sekali
- Pastikan teks Arab mudah dibaca dengan harakat yang tepat`;
        break;
      case 'mixed':
        languageInstruction = `PENTING - BAHASA OUTPUT:
- Gunakan DUA bahasa: Arab dan Indonesia
- Untuk setiap bagian konten, tulis dalam bahasa Arab terlebih dahulu dengan harakat lengkap
- Kemudian berikan terjemahan Indonesia di bawahnya
- Format: Teks Arab (dengan harakat) → Terjemahan Indonesia
- Contoh: "اَلْعِلْمُ نُوْرٌ" → "Ilmu adalah cahaya"
- Semua teks Arab WAJIB menggunakan harakat lengkap (fathah, kasrah, dhammah, sukun, tanwin, tasydid)`;
        break;
      case 'indonesian':
      default:
        languageInstruction = `PENTING - BAHASA OUTPUT:
- Gunakan bahasa Indonesia yang baik dan benar
- Jika ada istilah Arab, sertakan dengan harakat lengkap dan terjemahannya`;
        break;
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "generate_material":
        systemPrompt = `Anda adalah ahli pendidikan yang membantu dosen membuat materi pembelajaran yang berkualitas. 
${languageInstruction}
Format output dalam HTML sederhana dengan tag <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
Jangan gunakan markdown, hanya HTML.
${languageMode === 'arabic' || languageMode === 'mixed' ? 'Untuk teks Arab, gunakan tag <span dir="rtl" lang="ar" class="font-arabic"> untuk membungkus teks Arab.' : ''}`;
        userPrompt = `Buatkan materi pembelajaran dengan topik: "${topic}"
${indicators?.length ? `\nIndikator pembelajaran yang harus dicapai:\n${indicators.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}` : ""}
${context ? `\nKonteks tambahan: ${context}` : ""}

Buatkan materi yang lengkap, terstruktur, dan mudah dipahami oleh mahasiswa.`;
        break;

      case "generate_quiz":
        const qType = questionType || 'multiple_choice';
        const qCount = questionCount || 5;
        
        systemPrompt = `Anda adalah ahli pendidikan yang membantu dosen membuat soal quiz yang berkualitas.
${languageInstruction}
Output HARUS berupa JSON array yang valid tanpa markdown code block.
Setiap soal HARUS memiliki: question_type, question_text, correct_answer, dan feedback.
${languageMode === 'arabic' || languageMode === 'mixed' ? 'Pastikan semua teks Arab dalam question_text, options, dan feedback menggunakan harakat lengkap.' : ''}`;

        let formatGuide = '';
        switch (qType) {
          case 'multiple_choice':
            formatGuide = `Format: { "question_type": "multiple_choice", "question_text": "...", "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"], "correct_answer": 0, "feedback": "Penjelasan mengapa jawaban tersebut benar" }
correct_answer adalah index (0-3) dari options yang benar.`;
            break;
          case 'true_false':
            formatGuide = `Format: { "question_type": "true_false", "question_text": "Pernyataan untuk dinilai benar/salah...", "options": ["Benar", "Salah"], "correct_answer": 0, "feedback": "Penjelasan" }
correct_answer: 0 untuk Benar, 1 untuk Salah.`;
            break;
          case 'short_answer':
            formatGuide = `Format: { "question_type": "short_answer", "question_text": "...", "correct_answer": "jawaban singkat yang diharapkan", "feedback": "Penjelasan atau kata kunci yang diterima" }`;
            break;
          case 'long_answer':
            formatGuide = `Format: { "question_type": "long_answer", "question_text": "Pertanyaan yang membutuhkan jawaban panjang/essay...", "correct_answer": "Kunci jawaban atau poin-poin utama yang diharapkan", "feedback": "Kriteria penilaian dan poin-poin penting" }
Soal ini akan dinilai manual oleh dosen.`;
            break;
          case 'matching':
            formatGuide = `Format: { "question_type": "matching", "question_text": "Jodohkan item berikut:", "options": [{"left": "Term 1", "right": "Definition 1"}, {"left": "Term 2", "right": "Definition 2"}], "correct_answer": [[0,0], [1,1]], "feedback": "Penjelasan pasangan yang benar" }`;
            break;
          case 'select_missing_word':
            formatGuide = `Format: { "question_type": "select_missing_word", "question_text": "Kalimat dengan kata yang _____ untuk dipilih.", "options": ["kata1", "kata2", "kata3", "kata4"], "correct_answer": 0, "feedback": "Penjelasan kata yang tepat" }
correct_answer adalah index pilihan yang benar.`;
            break;
          default:
            formatGuide = `Format: { "question_type": "multiple_choice", "question_text": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "feedback": "Penjelasan" }`;
        }

        userPrompt = `Buatkan TEPAT ${qCount} soal quiz dengan tipe: ${qType}

Topik: ${topic}
${indicators?.length ? `\nIndikator yang diuji:\n${indicators.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}` : ""}

${formatGuide}

PENTING:
- Buat TEPAT ${qCount} soal, tidak lebih tidak kurang
- Semua soal harus bertipe "${qType}"
- Setiap soal WAJIB memiliki feedback yang menjelaskan jawaban
- Output HANYA JSON array tanpa teks lain atau markdown

Contoh output yang valid:
[
  { "question_type": "${qType}", "question_text": "...", ... }
]`;
        break;

      case "grade_answer":
        systemPrompt = `Anda adalah asisten grading yang menilai jawaban mahasiswa secara adil dan konstruktif.
Gunakan bahasa Indonesia. Berikan skor 0-100 dan feedback yang membantu.`;
        userPrompt = `Pertanyaan: ${questionText}
Jawaban benar: ${correctAnswer}
Jawaban mahasiswa: ${studentAnswer}

Berikan penilaian dalam format JSON:
{ "score": 0-100, "feedback": "penjelasan singkat dan konstruktif" }`;
        break;

      case "generate_feedback":
        systemPrompt = `Anda adalah tutor yang memberikan feedback konstruktif untuk membantu mahasiswa belajar.
Gunakan bahasa Indonesia yang ramah dan memotivasi.`;
        userPrompt = `Pertanyaan: ${questionText}
Jawaban benar: ${correctAnswer}
Jawaban mahasiswa: ${studentAnswer}

Berikan feedback yang:
1. Menjelaskan mengapa jawaban benar/salah
2. Memberikan tips untuk memahami materi dengan lebih baik
3. Mendorong mahasiswa untuk terus belajar`;
        break;

      default:
        throw new Error("Invalid request type");
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let content = "";

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
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        console.error("Anthropic API error:", anthropicResponse.status, errorText);
        throw new Error("Gagal terhubung ke Anthropic API. Periksa API Key Anda.");
      }

      const anthropicData = await anthropicResponse.json();
      content = anthropicData.content?.[0]?.text || "";
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
          // Return 200 so clients can handle gracefully (without causing a hard runtime crash),
          // while still surfacing rate-limit info via `code`.
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
      content = data.choices?.[0]?.message?.content || "";
    }

    return new Response(
      JSON.stringify({ content, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in elearning-ai function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
