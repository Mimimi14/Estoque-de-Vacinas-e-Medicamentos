
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcugfmmvgabpyhqtfpxy.supabase.co';
const supabaseKey = 'sb_publishable_s3h2kg1L6p2K9u_ccQKrug_DYr5Ug1u';

// Instância única do Supabase para toda a aplicação
export const supabase = createClient(supabaseUrl, supabaseKey);
