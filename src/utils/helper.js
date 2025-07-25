const db = require("../models");

const generateOTP = async (email) => {
  // Untuk mendapatkan 6 digit otp
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit kadaluarsa dari pertama kali dibuat

  // Buat atau perbarui OTP
  await db.OTP.upsert({
    email,
    otp_code: otp,
    expires_at: expiresAt,
    is_used: false,
  });

  return otp;
};

const verifyOTP = async (email, otp) => {
  // Mencocokan otp untuk email
  const otpRecord = await db.OTP.findOne({
    where: { email },
    order: [["createdAt", "DESC"]],
  });

  // Periksa apakah OTP ada, belum kedaluwarsa, dan belum digunakan
  if (
    !otpRecord ||
    otpRecord.is_used ||
    otpRecord.expires_at < new Date() ||
    otpRecord.otp_code !== otp
  ) {
    return false;
  }

  // Tandai OTP yang sudah digunakan
  await otpRecord.update({ is_used: true });

  return true;
};

module.exports = {
  generateOTP,
  verifyOTP,
};
