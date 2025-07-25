const jwt = require("jsonwebtoken");
const db = require("../models");

const authMiddleware = async (req, res, next) => {
  try {
    // Dapatkan token dari header Authorization
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Tidak ada token, otorisasi ditolak",
      });
    }

    // Verifikasi token untuk mendapatkan data pengguna
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Periksa apakah pengguna yang terkait dengan token masih ada di database dan aktif
    const user = await db.User.findByPk(decoded.id);
    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Pengguna tidak ditemukan atau tidak aktif",
      });
    }

    // Lampirkan objek pengguna ke objek request agar bisa diakses di controller selanjutnya
    req.user = user;
    next();
  } catch (error) {
    // Tangani error jika token tidak valid
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid",
      });
    }
    // Tangani error jika token sudah kedaluwarsa
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token telah kedaluwarsa",
      });
    }
    // Teruskan error lainnya ke middleware penanganan error global
    next(error);
  }
};

// middleware yang khusus membatasi akes berdasarkan role user
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    // Periksa apakah role user yang ada di request termasuk dalam daftar role yang diizinkan
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki izin yang diperlukan.",
      });
    }
    next();
  };
};

const validateRegistrationToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token registrasi diperlukan",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "registration_data" || decoded.step !== 3) {
      throw new Error("Invalid token type");
    }

    req.registrationData = decoded;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token registrasi tidak valid",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token registrasi telah kadaluarsa",
      });
    }
    next(error);
  }
};

module.exports = { authMiddleware, roleMiddleware, validateRegistrationToken };
