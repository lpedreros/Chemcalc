// supabase/functions/send-results/index.ts
// Sends calculator results to user via Resend and adds contact to Brevo.
// Deploy: supabase functions deploy send-results --no-verify-jwt
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY
//   BREVO_API_KEY
//   SUPABASE_URL         (auto-provided by Supabase runtime)
//   SUPABASE_SERVICE_ROLE_KEY  (auto-provided by Supabase runtime)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helper: fetch a random tip from the tips table ──────────────────────────
async function getRandomTip(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    // Count active tips, pick a random offset, fetch that one row
    const { count } = await supabase
      .from('tips')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)

    if (!count || count === 0) return ''

    const randomOffset = Math.floor(Math.random() * count)

    const { data, error } = await supabase
      .from('tips')
      .select('tip')
      .eq('active', true)
      .range(randomOffset, randomOffset)
      .single()

    if (error || !data) return ''
    return data.tip as string
  } catch {
    return ''
  }
}

// ─── Helper: build the email HTML ────────────────────────────────────────────
function buildEmailHtml(
  calculatorName: string,
  resultsHtml: string,
  sourceUrl: string,
  tip: string
): string {
  const tipBlock = tip
    ? `<div style="background:#e8f4f8;border-left:4px solid #3498db;padding:14px 18px;border-radius:4px;margin:24px 0;">
         <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#2c3e50;text-transform:uppercase;letter-spacing:0.05em;">Pro Tip</p>
         <p style="margin:0;font-size:14px;color:#2c3e50;">${tip}</p>
       </div>`
    : ''

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2c3e50;">
      <h2 style="color:#2c3e50;">Your ${calculatorName} Results</h2>

      <div style="background:#f8f9fa;padding:20px;border-radius:5px;margin-bottom:20px;">
        ${resultsHtml}
      </div>

      <p>
        <a href="${sourceUrl || 'https://chemcalc.co'}" style="color:#3498db;text-decoration:none;">&larr; Return to Calculator</a>
      </p>

      ${tipBlock}

      <hr style="border:0;border-top:1px solid #eee;margin:30px 0;">

      <h3 style="color:#2c3e50;">Need materials for your project?</h3>
      <p>Check out our curated marine repair kits and expert-recommended products.</p>
      <p>
        <a href="https://chemcalc.co/kits.html"
           style="display:inline-block;background:#3498db;color:white;padding:10px 20px;text-decoration:none;border-radius:3px;">
          Shop Marine Kits
        </a>
        &nbsp;&nbsp;
        <a href="https://chemcalc.co/estimate.html"
           style="display:inline-block;background:#2ecc71;color:white;padding:10px 20px;text-decoration:none;border-radius:3px;">
          Build an Estimate
        </a>
      </p>

      <p style="font-size:12px;color:#7f8c8d;margin-top:40px;">
        &copy; ${new Date().getFullYear()} Think &amp; Engage, LLC. All rights reserved.
      </p>
    </div>
  `
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, calculatorName, resultsHtml, sourceUrl } = await req.json()

    if (!email || !calculatorName || !resultsHtml) {
      throw new Error("Missing required fields: email, calculatorName, or resultsHtml")
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const BREVO_API_KEY  = Deno.env.get('BREVO_API_KEY')

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set in Edge Function secrets")
    if (!BREVO_API_KEY)  throw new Error("BREVO_API_KEY not set in Edge Function secrets")

    // ── 1. Fetch a random tip (non-blocking — fails silently) ────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const tip = await getRandomTip(supabase)

    // ── 2. Send email via Resend ─────────────────────────────────────────────
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ChemCalc Results <chemcalc-results@thinkandengage.com>',
        to: [email],
        subject: `Your ${calculatorName} Results from ChemCalc`,
        html: buildEmailHtml(calculatorName, resultsHtml, sourceUrl, tip)
      })
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error("Resend Error:", errorText)
      throw new Error(`Resend failed: ${resendResponse.status} ${resendResponse.statusText}`)
    }

    // ── 3. Add/update contact in Brevo (non-blocking — failure does not abort) ─
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        updateEnabled: true,
        attributes: { LAST_CALCULATOR_USED: calculatorName },
        listIds: [2]   // Confirm your Brevo list ID in the Brevo dashboard
      })
    })

    if (!brevoResponse.ok) {
      const brevoErr = await brevoResponse.text()
      console.warn("Brevo warning (contact may not have been added):", brevoErr)
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("send-results error:", (error as Error).message)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
