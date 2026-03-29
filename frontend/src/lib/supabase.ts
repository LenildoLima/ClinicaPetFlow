import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xvtupvwzzvludrhfqdai.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dHVwdnd6enZsdWRyaGZxZGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDI0NzgsImV4cCI6MjA4OTg3ODQ3OH0.lFqOONxPqeIC7Y-420CrwuF-dV8PcP8mYCco0QhYctw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
