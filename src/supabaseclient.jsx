import { createclient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ksjikdyauyyltbueymmg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzamlrZHlhdXl5bHRidWV5bW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzU2NDcsImV4cCI6MjA4MTExMTY0N30.qwZwwSKXRP7Lrs6vjAd_UtsWKO-KXxNIW4T_QPK1jnE';

export const supabase = createclient(supabaseUrl, supabaseAnonKey);
