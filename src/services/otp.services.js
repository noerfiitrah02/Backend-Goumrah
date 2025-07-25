const db = require("../models");
require("dotenv").config();

const generateOTP = async (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(
    Date.now() + process.env.OTP_EXPIRE_MINUTES * 60 * 1000
  );
  try {
  } catch (error) {}
  await db.OTP.upsert({
    email,
    otp_code: otp,
    expires_at: expiresAt,
    is_used: false,
  });

  return otp;
};

const verifyOTP = async (email, otp) => {
  // Cari OTP terbaru
  const otpRecord = await db.OTP.findOne({
    where: { email },
    order: [["createdAt", "DESC"]],
  });

  // Cek jika OTP tidak ada, sudah digunakan, atau sudah kadaluarsa
  if (
    !otpRecord ||
    otpRecord.is_used ||
    otpRecord.expires_at < new Date() ||
    otpRecord.otp_code !== otp
  ) {
    return false;
  }

  // Mark OTP as used
  await otpRecord.update({ is_used: true });

  return true;
};

module.exports = {
  generateOTP,
  verifyOTP,
};
