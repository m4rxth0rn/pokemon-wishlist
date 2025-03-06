import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kvjdsuqsijxokokjdqrk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2amRzdXFzaWp4b2tva2pkcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMjY0NTksImV4cCI6MjA1NjcwMjQ1OX0.6ZAgUbHUvhNW-Aa7Ac0jjYCG74UfPbFE2KPbzbqJXQA";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
