
import { createClient } from '@supabase/supabase-js';

// No Vercel, você pode configurar essas variáveis no Painel de Controle (Environment Variables)
// Isso aumenta a segurança e facilita a manutenção do projeto.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://zcugfmmvgabpyhqtfpxy.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_s3h2kg1L6p2K9u_ccQKrug_DYr5Ug1u';

export const supabase = createClient(supabaseUrl, supabaseKey);
