import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  phone: string;
  otp: string;
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  return digits.startsWith("+") ? phone : `+${digits}`;
}

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp }: VerifyRequest = await req.json();
    
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: "Phone and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneE164(phone);
    console.log(`Verifying OTP for phone: ${formattedPhone.slice(-4)}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("agreement_otps")
      .select("*")
      .eq("phone", formattedPhone)
      .is("verified_at", null)
      .single();

    if (fetchError || !otpRecord) {
      console.log("No OTP found for phone:", formattedPhone.slice(-4));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No verification code found. Please request a new code." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.log("OTP expired for phone:", formattedPhone.slice(-4));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Verification code has expired. Please request a new code." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      console.log("Max attempts reached for phone:", formattedPhone.slice(-4));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many failed attempts. Please request a new code." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided OTP and compare
    const providedHash = await hashOTP(otp);
    
    if (providedHash !== otpRecord.otp_hash) {
      // Increment attempts
      await supabase
        .from("agreement_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      console.log("Invalid OTP provided for phone:", formattedPhone.slice(-4));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid verification code. Please try again.",
          attemptsRemaining: 4 - otpRecord.attempts,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    const verifiedAt = new Date().toISOString();
    await supabase
      .from("agreement_otps")
      .update({ verified_at: verifiedAt })
      .eq("id", otpRecord.id);

    console.log("OTP verified successfully for phone:", formattedPhone.slice(-4));

    return new Response(
      JSON.stringify({
        success: true,
        verifiedAt,
        agreementId: otpRecord.agreement_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in verify-agreement-otp:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
