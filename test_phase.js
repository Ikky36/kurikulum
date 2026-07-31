import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => { const [k, v] = line.split('='); if(k&&v) acc[k.trim()] = v.trim().replace(/"/g, ''); return acc; }, {});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function test() {
  const { data: subs, error } = await supabase.from('ta_submissions').select('id, type_id, status, current_phase_id');
  console.log('Total Submissions:', subs?.length);
  if (subs) {
    for (let s of subs) {
      if (s.status === 'approved') {
        console.log('ID:', s.id, 'Type:', s.type_id, 'Phase:', s.current_phase_id);
        const { data: p } = await supabase.from('ta_master_phases').select('*').eq('type_id', s.type_id);
        console.log('Phases count:', p?.length);
      }
    }
  }
}
test();
