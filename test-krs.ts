import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xextgvbezemfnhjugcuz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleHRndmJlemVtZm5oanVnY3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODQ5MjYsImV4cCI6MjA5ODY2MDkyNn0.WrIBHeJOnMoggru3z2J2VDdr4fVt-c8cAqj34lOaeZY";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_policies' as any).select('*');
  console.log('Policies:', data);
}

run();
