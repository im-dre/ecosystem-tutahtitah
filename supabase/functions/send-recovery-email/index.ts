import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS Headers agar bisa dipanggil dari Frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, role, origin } = await req.json()
    
    if (!email || !role) {
      throw new Error('Email and role are required')
    }

    // Initialize Supabase Admin Client
    // Kita butuh Service Role Key untuk mem-bypass dan generate action_link
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Default redirect jika origin tidak dikirim (fallback)
    const redirectTo = origin ? `${origin}/update-password` : 'https://tutahtitah.id/update-password'

    // Generate Recovery Link via Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo
      }
    })

    if (linkError) throw linkError

    const actionLink = linkData?.properties?.action_link

    // Tentukan tema & template berdasarkan Role
    let subject = ''
    let greeting = ''
    let primaryColor = ''
    let logoUrl = 'https://tutahtitah.com/logo.png' // Sesuaikan jika ada URL logo asli
    let roleName = ''

    switch (role) {
      case 'customer':
        subject = 'Reset Password Akun Tutah Titah'
        greeting = 'Halo Bro/Sis!'
        primaryColor = '#004aad' // Biru Tutah Titah
        roleName = 'Customer'
        break
      case 'merchant':
        subject = 'Reset Password Portal Mitra UMKM'
        greeting = 'Halo Mitra Tutah Titah!'
        primaryColor = '#eab308' // Kuning Tutah Titah
        roleName = 'Mitra UMKM'
        break
      case 'kurir':
      case 'admin':
        subject = 'Reset Password Aplikasi Internal'
        greeting = 'Halo Tim Tutah Titah!'
        primaryColor = '#004aad' // Kombinasi bisa disesuaikan, kita pakai Biru
        roleName = 'Tim Internal'
        break
      default:
        subject = 'Reset Password Tutah Titah'
        greeting = 'Halo!'
        primaryColor = '#004aad'
        roleName = 'Pengguna'
    }

    // Build HTML Email Template
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <!-- Import Font Anton -->
        <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
        
        <div style="text-align: center; background-color: #004aad; padding: 35px 20px; border-radius: 12px 12px 0 0;">
          <h2 style="font-family: 'Anton', Arial, sans-serif; margin: 0; font-size: 46px; letter-spacing: 1px; font-style: italic; text-shadow: 3px 3px 5px rgba(0,0,0,0.3);">
            <span style="color: #ffde59;">TUTAH</span><span style="color: #ffffff;">TITAH</span>
          </h2>
          <p style="color: #ffde59; font-size: 14px; margin-top: 8px; font-family: 'Anton', Arial, sans-serif; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">SEMUA KAMI KERJAKAN !</p>
        </div>
        
        <div style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 30px; border: 1px solid #eee; border-top: none;">
          <h3 style="margin-top: 0; color: #111;">${greeting}</h3>
          <p style="line-height: 1.6;">
            Kami menerima permintaan untuk mereset password akun <strong>${roleName}</strong> Anda yang terdaftar dengan email ini.
          </p>
          <p style="line-height: 1.6; margin-bottom: 30px;">
            Silakan klik tombol di bawah ini untuk mengatur ulang password Anda. Tautan ini hanya berlaku sementara.
          </p>
          
          <div style="text-align: center;">
            <a href="${actionLink}" 
               style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px;">
              Reset Password Saya
            </a>
          </div>
          
          <p style="line-height: 1.6; margin-top: 30px; font-size: 13px; color: #666;">
            Jika Anda tidak merasa meminta reset password, abaikan saja email ini. Akun Anda tetap aman.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} Tutah Titah. All rights reserved.
        </div>
      </div>
    `

    // Kirim via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Tutah Titah <noreply@tutahtitah.com>', // Sesuaikan dengan domain terverifikasi di Resend
        to: [email],
        subject: subject,
        html: htmlTemplate,
      }),
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendResult)}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Recovery email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
