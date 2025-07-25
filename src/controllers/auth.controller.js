const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const db = require("../models");
const { sendEmail } = require("../services/email.services");
const {
  getProviderFromNumber,
  cleanPhoneNumber,
} = require("../utils/phoneValidation.js");
const { generateOTP, verifyOTP } = require("../services/otp.services");
const emailTemplates = require("../utils/emailTemplate");

// Fungsi utilitas untuk menghapus file yang di folder upload jika terjadi error
const deleteUploadedFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting file: ${filePath}`, error);
    }
  }
};

// Langkah 1 Registrasi: Mengirim OTP ke email pengguna
const sendRegistrationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Hasilkan dan simpan OTP
    const otp = await generateOTP(email);

    // Kirim email berisi OTP menggunakan template
    const emailTemplate = emailTemplates.emailVerification(otp);
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    res.json({
      success: true,
      message: "OTP berhasil dikirim ke email Anda",
      data: { email },
    });
  } catch (error) {
    next(error);
  }
};

// Langkah 2 Registrasi: Memverifikasi OTP yang dimasukkan pengguna
const verifyRegistrationOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validasi input dasar
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email dan OTP wajib diisi",
      });
    }
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Verifikasi OTP dengan data di database
    const isValid = await verifyOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "OTP tidak valid atau kadaluarsa",
      });
    }
    // Buat token sementara untuk langkah registrasi berikutnya
    const tempToken = jwt.sign(
      {
        email,
        type: "email_verified",
        step: 2,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );
    res.json({
      success: true,
      message:
        "Email berhasil diverifikasi! Silakan lanjutkan ke tahap berikutnya.",
      tempToken,
      data: {
        email,
        nextStep: 3,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Langkah 3 Registrasi: Melengkapi data (password, no. telp) dan membuat user
const completeRegistration = async (req, res, next) => {
  try {
    const { password, phone_number } = req.body;
    const tempToken = req.headers.authorization?.replace("Bearer ", "");

    // Validasi token sementara dari langkah sebelumnya
    if (!tempToken) {
      return res.status(401).json({
        success: false,
        message: "Token verifikasi email diperlukan",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (decoded.type !== "email_verified" || decoded.step !== 2) {
        throw new Error("Invalid token type");
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token verifikasi tidak valid atau kadaluarsa",
      });
    }

    const { email } = decoded;
    // Validasi input password dan nomor telepon
    if (!password || !phone_number) {
      return res.status(400).json({
        success: false,
        message: "Password dan nomor telepon wajib diisi",
      });
    }

    // Validasi format password
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password harus memiliki minimal 6 karakter dan mengandung huruf dan angka",
      });
    }

    // Validasi panjang password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    // Cek apakah nomor telepon valid dan dari provider Indonesia
    const provider = getProviderFromNumber(phone_number);
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon tidak valid.",
      });
    }

    // Bersihkan nomor telepon sebelum disimpan
    const cleanedPhoneNumber = cleanPhoneNumber(phone_number);

    // Cek sekali lagi jika email sudah ada (untuk mencegah race condition)
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    const existingPhoneNumber = await db.User.findOne({
      where: { phone_number: cleanedPhoneNumber },
    });
    if (existingPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon sudah terdaftar",
      });
    }

    const step4Token = jwt.sign(
      {
        email,
        password: await bcrypt.hash(password, 10),
        phone_number: cleanedPhoneNumber,
        type: "registration_data",
        step: 3,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Data valid! Silakan lanjutkan ke pengisian profil.",
      step4Token,
    });
  } catch (error) {
    next(error);
  }
};

// Langkah 4: Buat user baru di database
const completeProfile = async (req, res, next) => {
  try {
    const {
      name,
      address,
      nik,
      birth_date,
      birth_place,
      is_using_bank_financing,
      bank_id,
    } = req.body;

    // Dapatkan token dari header
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token registrasi diperlukan",
      });
    }

    // Verifikasi token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== "registration_data" || decoded.step !== 3) {
        throw new Error("Invalid token type");
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token registrasi tidak valid atau kadaluarsa",
      });
    }

    // Cek apakah email sudah terdaftar (race condition)
    const existingUser = await db.User.findOne({
      where: { email: decoded.email },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Cek apakah nomor telepon sudah terdaftar (race condition)
    const existingPhoneNumber = await db.User.findOne({
      where: { phone_number: decoded.phone_number },
    });
    if (existingPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon sudah terdaftar",
      });
    }

    // Cek apakah nik sudah terdaftar (race condition)
    const existingNik = await db.User.findOne({ where: { nik } });
    if (existingNik) {
      return res.status(400).json({
        success: false,
        message: "NIK sudah terdaftar",
      });
    }

    // Buat user baru
    const user = await db.User.create({
      name,
      email: decoded.email,
      password: decoded.password, // sudah di-hash
      phone_number: decoded.phone_number,
      role: "user",
      status: "active",
      address,
      nik,
      birth_date,
      birth_place,
      is_using_bank_financing,
      bank_id: is_using_bank_financing ? bank_id : null,
    });

    // Buat token JWT standar untuk login
    const authToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      success: true,
      message: "Registrasi berhasil!",
      token: authToken,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk login pengguna
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validasi input email dan password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }

    // Cari pengguna berdasarkan email, termasuk data travel agent jika ada
    const user = await db.User.findOne({
      where: { email },
      include: [
        {
          model: db.TravelAgent,
          as: "travelAgent",
        },
      ],
    });

    // Jika pengguna tidak ditemukan
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Kredensial tidak valid" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    // Jika password tidak cocok
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Password dan Email salah" });
    }

    // Cek apakah akun pengguna aktif
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Akun Anda belum aktif atau sedang dalam review.",
      });
    }

    // Buat JSON Web Token (JWT) untuk sesi pengguna
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Tentukan apakah pengguna perlu melengkapi profilnya
    const needsProfileCompletion = user.name === "User";

    // Kirim token dan data pengguna sebagai respons
    res.json({
      success: true,
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        needsProfileCompletion,
        travelAgent: user.travelAgent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mendapatkan data pengguna yang sedang login
const getMe = async (req, res, next) => {
  try {
    const { id } = req.user;
    // Cari pengguna berdasarkan ID dari token yang sudah diverifikasi oleh middleware
    const user = await db.User.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.TravelAgent,
          as: "travelAgent",
          attributes: [
            "id",
            "travel_name",
            "company_name",
            "sk_number",
            "logo",
            "phone_number",
            "address",
            "email",
          ],
        },
        {
          model: db.Bank,
          as: "bank",
          attributes: ["id", "bank_name", "logo"],
        },
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    // Cek apakah profil perlu dilengkapi
    const needsProfileCompletion = user.name === "User";

    // Kirim data lengkap pengguna
    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        needsProfileCompletion,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk memulai proses lupa password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validasi input email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    // Cari pengguna berdasarkan email
    const emailUser = await db.User.findOne({ where: { email } });

    // jika email tidak ditemukan
    if (!emailUser) {
      return res.status(404).json({
        success: false,
        message: "Email tidak terdaftar",
      });
    }

    // Hasilkan OTP untuk reset password
    const otp = await generateOTP(email);

    // Kirim email reset password
    const emailTemplate = emailTemplates.resetPassword(user.name, otp);
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    res.json({ success: true, message: "OTP berhasil dikirim ke email Anda" });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mereset password setelah verifikasi OTP
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validasi semua input yang diperlukan
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, dan password baru wajib diisi",
      });
    }

    // Validasi panjang password baru
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    // Verifikasi OTP
    const isValid = await verifyOTP(email, otp);
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "OTP tidak valid atau kadaluarsa" });
    }

    // Hash password baru dan perbarui di database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.User.update({ password: hashedPassword }, { where: { email } });

    res.json({ success: true, message: "Password berhasil diubah" });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk registrasi travel agent
const registerTravelAgent = async (req, res, next) => {
  try {
    const {
      travel_name,
      company_name,
      sk_number,
      address,
      phone_number,
      email,
      password,
    } = req.body;
    const uploadedFilePath = req.file ? req.file.path : null;

    // Daftar field yang wajib diisi
    const requiredFields = [
      "travel_name",
      "sk_number",
      "address",
      "phone_number",
      "email",
      "password",
    ];

    // Validasi semua field wajib
    for (const field of requiredFields) {
      if (!req.body[field]) {
        if (uploadedFilePath) {
          deleteUploadedFile(uploadedFilePath);
        }
        return res.status(400).json({
          success: false,
          message: `${field.replace("_", " ")} wajib diisi`,
        });
      }
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (uploadedFilePath) {
        deleteUploadedFile(uploadedFilePath);
      }
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    // Validasi format password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,20}$/;
    if (!passwordRegex.test(password)) {
      if (uploadedFilePath) {
        deleteUploadedFile(uploadedFilePath);
      }
      return res.status(400).json({
        success: false,
        message:
          "Password harus memiliki setidaknya satu huruf besar, satu huruf kecil, dan satu angka",
      });
    }

    // Validasi panjang password
    if (password.length < 6) {
      if (uploadedFilePath) {
        deleteUploadedFile(uploadedFilePath);
      }
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    // Cek apakah email sudah ada
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      if (uploadedFilePath) {
        deleteUploadedFile(uploadedFilePath);
      }
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Cek apakah nomor telepon valid dan dari provider Indonesia
    const provider = getProviderFromNumber(phone_number);
    if (!provider) {
      if (uploadedFilePath) {
        deleteUploadedFile(uploadedFilePath);
      }
      return res.status(400).json({
        success: false,
        message:
          "Nomor telepon tidak valid. Pastikan nomor yang Anda masukkan adalah nomor provider Indonesia yang aktif.",
      });
    }

    const cleanedPhoneNumber = cleanPhoneNumber(phone_number);

    // Mulai transaksi database untuk memastikan konsistensi data
    const transaction = await db.sequelize.transaction();

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Buat record user baru dengan role 'travel_agent' dan status 'pending'
      const user = await db.User.create(
        {
          name: travel_name,
          email,
          password: hashedPassword,
          phone_number: cleanedPhoneNumber,
          role: "travel_agent",
          status: "pending",
        },
        { transaction }
      );

      // Buat record travel agent yang terhubung dengan user
      const travelAgent = await db.TravelAgent.create(
        {
          user_id: user.id,
          logo: uploadedFilePath ? uploadedFilePath.replace(/\\/g, "/") : null,
          travel_name,
          company_name,
          sk_number,
          phone_number: cleanedPhoneNumber,
          address,
          email,
        },
        { transaction }
      );

      // Jika semua berhasil, commit transaksi
      await transaction.commit();

      // Kirim email notifikasi ke admin
      try {
        const emailTemplate = emailTemplates.travelAgentRegistration({
          travel_name,
          company_name,
          email,
          phone_number,
          sk_number,
          address,
        });

        await sendEmail({
          to: "ichwannoer138@gmail.com",
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });
      } catch (emailError) {
        console.error("Failed to send admin notification email:", emailError);
      }

      // Kirim respons sukses
      return res.status(201).json({
        success: true,
        message: "Registrasi Berhasil, menunggu verifikasi admin",
        data: {
          user_id: user.id,
          travel_agent_id: travelAgent.id,
          email: user.email,
          travel_name: travelAgent.travel_name,
          status: user.status,
        },
      });
    } catch (dbError) {
      // Jika terjadi error, rollback transaksi dan hapus file yang sudah di-upload
      await transaction.rollback();
      if (uploadedFilePath) {
        deleteUploadedFile(uploadedFilePath);
      }
      throw dbError;
    }
  } catch (error) {
    // Tangani error umum dan pastikan file yang di-upload dihapus
    if (req.file && req.file.path) {
      deleteUploadedFile(req.file.path);
    }
    next(error);
  }
};

module.exports = {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  completeRegistration,
  completeProfile,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  registerTravelAgent,
};
