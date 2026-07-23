import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data, error } = await supabase.from('courses').select('id, code, name, semester, curriculum_id').order('created_at', { ascending: false }).limit(10);
  if (error) console.error("Error:", error);
  else console.log("Recent courses:", data);
}

checkDb();
