/* ============================================================
   supabase-client.js
   Shared Supabase client instance for all ChemCalc pages.
   Must be loaded AFTER the Supabase CDN script.
   ============================================================ */

const SUPABASE_URL  = 'https://rnrzjlfpwxzomupnxikt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucnpqbGZwd3h6b211cG54aWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTQwNDAsImV4cCI6MjA5ODMzMDA0MH0.saHft_c7A18Z4EQ0D69Zqxxcb8IS9ZC0S6rE4zwd9S0';

// Global Supabase client instance
const _sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON) : null;

if (!_sb) {
  console.warn("Supabase client not initialized. Ensure the Supabase CDN script is loaded before supabase-client.js");
}
