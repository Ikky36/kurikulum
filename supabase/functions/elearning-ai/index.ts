import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: AIRequest = await req.json();
    const { type, context, topic, indicators, questionType, questionCount, studentAnswer, correctAnswer, questionText } = body;

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "generate_material":
        systemPrompt = `Anda adalah ahli pendidikan yang membantu dosen membuat materi pembelajaran yang berkualitas. 
Gunakan bahasa Indonesia yang baik dan benar.
Format output dalam HTML sederhana dengan tag <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
Jangan gunakan markdown, hanya HTML.`;
        userPrompt = `Buatkan materi pembelajaran dengan topik: "${topic}"
${indicators?.length ? `\nIndikator pembelajaran yang harus dicapai:\n${indicators.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}` : ""}
${context ? `\nKonteks tambahan: ${context}` : ""}

Buatkan materi yang lengkap, terstruktur, dan mudah dipahami oleh mahasiswa.`;
        break;

      case "generate_quiz":
        systemPrompt = `Anda adalah ahli pendidikan yang membantu dosen membuat soal quiz yang berkualitas.
Gunakan bahasa Indonesia yang baik dan benar.
Output dalam format JSON array dengan struktur sesuai tipe soal.`;
        userPrompt = `Buatkan ${questionCount || 5} soal quiz dengan tipe: ${questionType}
Topik: ${topic}
${indicators?.length ? `\nIndikator yang diuji:\n${indicators.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}` : ""}

Format output JSON sesuai tipe soal:
- multiple_choice: { question_text, options: [{label: "A", text: "..."}], correct_answer: "A" }
- true_false: { question_text, correct_answer: true/false }
- short_answer: { question_text, correct_answer: "..." }
- matching: { question_text, pairs: [{left: "...", right: "..."}] }
- select_missing_word: { question_text: "Teks dengan [BLANK] untuk jawaban", options: ["..."], correct_answer: "..." }

Berikan JSON array yang valid tanpa markdown code block.`;
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

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
