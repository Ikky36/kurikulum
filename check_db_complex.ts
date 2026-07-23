import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xextgvbezemfnhjugcuz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleHRndmJlemVtZm5oanVnY3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODQ5MjYsImV4cCI6MjA5ODY2MDkyNn0.WrIBHeJOnMoggru3z2J2VDdr4fVt-c8cAqj34lOaeZY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data, error } = await supabase.from('courses').select('*, curricula:curriculum_id(*), course_plos(plo_id, plos(*)), course_profil_lulusan(profil_lulusan_id, profil_lulusan:profil_lulusan_id(*)), course_prerequisites!course_prerequisites_course_id_fkey(prerequisite_course_id)').order('code').limit(1);
  if (error) console.error("Query Error:", error);
  else console.log("Success! Data:", data);
}

checkDb();
