import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function fix() {
  const { data: submissions } = await supabase.from('ta_submissions').select('id, type_id, status, current_phase_id').eq('status', 'approved').is('current_phase_id', null);
  if (submissions && submissions.length > 0) {
    for (const sub of submissions) {
      const { data: firstPhase } = await supabase.from('ta_master_phases').select('id').eq('type_id', sub.type_id).order('order_number', { ascending: true }).limit(1).maybeSingle();
      if (firstPhase) {
        await supabase.from('ta_submissions').update({ current_phase_id: firstPhase.id }).eq('id', sub.id);
        console.log('Updated submission with phase ' + firstPhase.id);
      }
    }
  }
  console.log('Done');
}
fix();
