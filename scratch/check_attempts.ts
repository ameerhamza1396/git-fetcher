import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://pxjvltgarzvoptdfdkxq.supabase.co"
const supabaseAnonKey = "sb_publishable_RVLZ7IetJ-w7raWeYGWa5A_5wV4g5rI"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkMCQColumns() {
  const targetId = "99cd108d-ea05-4320-994e-012f1474276a";
  
  const { data, error } = await supabase
    .from('mcqs')
    .select('*')
    .eq('id', targetId)
    .maybeSingle();

  console.log("MCQ Details:", JSON.stringify(data, null, 2), "Error:", error);
}

checkMCQColumns();
