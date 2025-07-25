const emailTemplates = {
  // Template untuk verifikasi email registrasi
  emailVerification: (otp) => ({
    subject: "Verifikasi Email - Goumroh Travel",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <div style="text-align: center;">
            <img src="${
              process.env.BASE_URL
            }/uploads/assets/goumroh.jpg" alt="Goumroh Travel" style="width: 120px; margin-bottom: 20px;" />
          </div>
          <h2 style="color: #333;">Verifikasi Email Anda</h2>
          <p style="font-size: 16px; color: #555;">Terima kasih telah memilih <strong>Goumroh Travel</strong>.</p>
          <p style="font-size: 16px; color: #555;">Kode OTP verifikasi email Anda adalah:</p>
          <div style="font-size: 24px; font-weight: bold; color: #2c3e50; margin: 20px 0; text-align: center;">${otp}</div>
          <p style="font-size: 14px; color: #888;">Jangan bagikan kode ini kepada siapa pun. Berlaku selama 10 menit.</p>
          <hr style="margin: 30px 0;" />
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            &copy; ${new Date().getFullYear()} Goumroh Travel. All rights reserved.
          </p>
        </div>
      </div>
    `,
  }),

  // Template untuk reset password
  resetPassword: (userName, otp) => ({
    subject: "Reset Password - Goumroh Travel",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <div style="text-align: center;">
            <img src="${
              process.env.BASE_URL
            }/uploads/assets/goumroh.jpg" alt="Goumroh" style="width: 120px; margin-bottom: 20px;" />
          </div>
          <h2 style="color: #333;">Reset Password Anda</h2>
          <p style="font-size: 16px; color: #555;">Halo <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #555;">Kami menerima permintaan untuk mereset password akun <strong>Goumroh Travel</strong> Anda.</p>
          <p style="font-size: 16px; color: #555;">Kode OTP untuk reset password Anda adalah:</p>
          <div style="font-size: 24px; font-weight: bold; color: #2c3e50; margin: 20px 0; text-align: center;">${otp}</div>
          <p style="font-size: 14px; color: #888;">Jangan bagikan kode ini kepada siapa pun. Berlaku selama 10 menit.</p>
          <hr style="margin: 30px 0;" />
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            &copy; ${new Date().getFullYear()} Goumroh Travel. All rights reserved.
          </p>
        </div>
      </div>
    `,
  }),

  // Template untuk notifikasi admin pendaftaran travel agent
  travelAgentRegistration: (travelAgentData) => ({
    subject: "Pendaftaran Travel Agent Baru - Goumroh Travel",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <div style="text-align: center;">
            <img src="${
              process.env.BASE_URL
            }/uploads/assets/goumroh.jpg" alt="Goumroh Travel" style="width: 120px; margin-bottom: 20px;" />
          </div>
          <h2 style="color: #333;">Pendaftaran Travel Agent Baru</h2>
          <p style="font-size: 16px; color: #555;">Berikut detail pendaftaran travel agent baru:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #2c3e50;">Nama Travel:</strong> ${
              travelAgentData.travel_name
            }</p>
            <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #2c3e50;">Perusahaan:</strong> ${
              travelAgentData.company_name || "-"
            }</p>
            <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #2c3e50;">Email:</strong> ${
              travelAgentData.email
            }</p>
            <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #2c3e50;">Nomor Telepon:</strong> ${
              travelAgentData.phone_number
            }</p>
            <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #2c3e50;">Nomor SK:</strong> ${
              travelAgentData.sk_number
            }</p>
            <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #2c3e50;">Alamat:</strong> ${
              travelAgentData.address
            }</p>
          </div>
          
          <p style="font-size: 16px; color: #555;">Silakan verifikasi pendaftaran ini melalui dashboard admin.</p>
          
          <hr style="margin: 30px 0;" />
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            &copy; ${new Date().getFullYear()} Goumroh Travel. All rights reserved.
          </p>
        </div>
      </div>
    `,
  }),
};

module.exports = emailTemplates;
