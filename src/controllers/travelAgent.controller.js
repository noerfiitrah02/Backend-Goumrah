const db = require("../models");
const { Op } = require("sequelize");
const fs = require("fs").promises;
const { getProviderFromNumber } = require("../utils/phoneValidation");
const bcrypt = require("bcryptjs");

const createTravelAgent = async (req, res, next) => {
  // Mulai transaksi untuk memastikan konsistensi data
  const transaction = await db.sequelize.transaction();
  try {
    // Ambil semua data yang diperlukan dari body request
    const {
      travel_name,
      company_name,
      sk_number,
      phone_number,
      address,
      email,
      password,
    } = req.body;

    // Validasi field wajib
    const requiredFields = [
      "travel_name",
      "sk_number",
      "phone_number",
      "address",
      "email",
      "password",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${field.replace("_", " ")} wajib diisi`,
        });
      }
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
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
        message: "Nomor telepon tidak valid",
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

    // cek apakah nomor sk sudah ada
    const existingTravelAgent = await db.TravelAgent.findOne({
      where: { sk_number },
    });
    if (existingTravelAgent) {
      return res.status(400).json({
        success: false,
        message: "Nomor SK sudah terdaftar",
      });
    }

    // Cek apakah nomor telepon sudah ada
    const existingTravelAgentPhoneNumber = await db.TravelAgent.findOne({
      where: { phone_number },
    });
    if (existingTravelAgentPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon sudah terdaftar",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user baru dengan role travel_agent dan status active
    const user = await db.User.create(
      {
        name: travel_name,
        email,
        password: hashedPassword,
        phone_number,
        role: "travel_agent",
        status: "active",
      },
      { transaction }
    );

    // Buat record travel agent baru di dalam transaksi
    const travelAgent = await db.TravelAgent.create(
      {
        user_id: user.id,
        logo: req.file ? req.file.path.replace(/\\/g, "/") : null,
        travel_name,
        company_name,
        sk_number,
        phone_number,
        address,
        email,
      },
      { transaction }
    );

    // Jika semua berhasil, commit transaksi
    await transaction.commit();

    // Kirim respons sukses
    res.status(201).json({
      success: true,
      message: "Travel agent berhasil ditambahkan.",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        travelAgent,
      },
    });
  } catch (error) {
    await transaction.rollback();

    // Hapus file yang sudah diupload jika ada error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error("Gagal menghapus file upload:", err);
      }
    }

    next(error);
  }
};

const getAllTravelAgents = async (req, res, next) => {
  try {
    // Ambil parameter query untuk filter dan pencarian
    const { search, status } = req.query;
    const where = {};

    // Bangun klausa 'where' untuk pencarian teks
    if (search) {
      where[Op.or] = [
        { travel_name: { [Op.like]: `%${search}%` } },
        { company_name: { [Op.like]: `%${search}%` } },
        { sk_number: { [Op.like]: `%${search}%` } },
      ];
    }

    // Siapkan klausa 'include' untuk menggabungkan data dengan model User
    const include = [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "name", "email", "phone_number", "status"],
        where: {},
      },
    ];

    // Tambahkan filter status pada data User yang di-include
    if (status) {
      include[0].where.status = status;
    }

    // Ambil semua data travel agent sesuai filter
    const travelAgents = await db.TravelAgent.findAll({
      where,
      include,
    });

    // Kirim daftar travel agent sebagai respons
    res.json({ success: true, data: travelAgents });
  } catch (error) {
    next(error);
  }
};

const getTravelAgent = async (req, res, next) => {
  try {
    // Cari travel agent berdasarkan ID dan sertakan data user terkait
    const travelAgent = await db.TravelAgent.findByPk(req.params.id, {
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email", "phone_number", "status"],
        },
      ],
    });

    // Jika tidak ditemukan, kirim error 404
    if (!travelAgent) {
      return res.status(404).json({
        success: false,
        message: "Travel Agent tidak ditemukan",
      });
    }

    // Kirim data travel agent yang ditemukan
    res.status(200).json({ success: true, data: travelAgent });
  } catch (error) {
    next(error);
  }
};

const getTravelAgentForInfo = async (req, res, next) => {
  try {
    // Cari travel agent berdasarkan ID dengan field terbatas
    const travelAgent = await db.TravelAgent.findByPk(req.params.id, {
      attributes: [
        "id",
        "travel_name",
        "logo",
        "company_name",
        "phone_number",
        "address",
      ],
    });

    // Jika tidak ditemukan, kirim error 404
    if (!travelAgent) {
      return res.status(404).json({
        success: false,
        message: "Travel Agent tidak ditemukan",
      });
    }

    // Kirim data yang disaring
    res.status(200).json({ success: true, data: travelAgent });
  } catch (error) {
    next(error);
  }
};

const updateTravelAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      travel_name,
      company_name,
      sk_number,
      phone_number,
      address,
      email,
    } = req.body;

    // Cari travel agent yang akan di-update
    const travelAgent = await db.TravelAgent.findByPk(id);
    if (!travelAgent) {
      return res.status(404).json({
        success: false,
        message: "Travel Agent tidak ditemukan",
      });
    }

    // Validasi nomor telepon jika diubah
    if (phone_number) {
      const provider = getProviderFromNumber(phone_number);
      if (!provider) {
        return res.status(400).json({
          success: false,
          message: "Nomor telepon tidak valid",
        });
      }
    }

    // Validasi email jika diubah
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Format email tidak valid",
        });
      }
    }

    // Cek apakah nomor telepon sudah terdaftar
    const existingTravelAgent = await db.TravelAgent.findOne({
      where: { phone_number },
    });
    if (existingTravelAgent) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon sudah terdaftar",
      });
    }

    // Jika ada file logo baru yang di-upload
    if (req.file) {
      // Hapus file logo lama jika ada
      if (travelAgent.logo) {
        const oldLogoPath = travelAgent.logo.replace(/\\/g, "/");
        try {
          await fs.access(oldLogoPath);
          await fs.unlink(oldLogoPath);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.error("Gagal menghapus logo lama agen perjalanan:", err);
          }
        }
      }
      // Perbarui path logo dengan yang baru
      travelAgent.logo = req.file.path.replace(/\\/g, "/");
    }

    // Update field-field lain jika ada di body request
    if (travel_name) travelAgent.travel_name = travel_name;
    if (company_name) travelAgent.company_name = company_name;
    if (sk_number) travelAgent.sk_number = sk_number;
    if (phone_number) travelAgent.phone_number = phone_number;
    if (address) travelAgent.address = address;
    if (email) travelAgent.email = email;

    await travelAgent.save();

    // Kirim respons sukses dengan data yang sudah di-update
    res.status(200).json({ success: true, data: travelAgent });
  } catch (error) {
    next(error);
  }
};

const deleteTravelAgent = async (req, res, next) => {
  // Mulai transaksi untuk memastikan konsistensi data
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const travelAgent = await db.TravelAgent.findByPk(id, { transaction });
    // Jika travel agent tidak ditemukan, batalkan transaksi dan kirim error
    if (!travelAgent) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Agent Travel tidak ditemukan",
      });
    }

    const userId = travelAgent.user_id;

    // Cek apakah travel agent ini memiliki paket yang terhubung
    const packageCount = await db.Package.count({
      where: { created_by: userId },
      transaction,
    });

    if (packageCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus travel agent yang memiliki paket",
      });
    }

    // Jika ada logo, hapus file dari server
    if (travelAgent.logo) {
      const logoPath = travelAgent.logo.replace(/\\/g, "/");
      try {
        await fs.access(logoPath);
        await fs.unlink(logoPath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Gagal menghapus logo Travel Agent saat delete:", err);
        }
      }
    }

    await travelAgent.destroy({ transaction });

    await db.User.destroy({ where: { id: userId }, transaction });

    // Jika semua berhasil, commit transaksi
    await transaction.commit();
    res.status(200).json({
      success: true,
      message: "Travel agent berhasil dihapus.",
    });
  } catch (error) {
    // Jika terjadi error, batalkan semua perubahan (rollback)
    await transaction.rollback();
    next(error);
  }
};

const getTravelAgentProfile = async (req, res, next) => {
  try {
    // Ambil ID user dari token
    const userId = req.user.id;

    // Cari travel agent berdasarkan user_id
    const travelAgent = await db.TravelAgent.findOne({
      where: { user_id: userId },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email", "phone_number"],
        },
      ],
    });

    if (!travelAgent) {
      return res.status(404).json({
        success: false,
        message: "Profil travel agent tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: travelAgent,
    });
  } catch (error) {
    next(error);
  }
};

const updateTravelAgentProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Cari travel agent berdasarkan user_id
    const travelAgent = await db.TravelAgent.findOne({
      where: { user_id: userId },
    });

    if (!travelAgent) {
      return res.status(404).json({
        success: false,
        message: "Profil travel agent tidak ditemukan",
      });
    }

    // Ambil data yang akan di-update
    const {
      travel_name,
      company_name,
      sk_number,
      phone_number,
      address,
      email,
    } = req.body;

    // Validasi nomor telepon jika diubah
    if (phone_number) {
      const provider = getProviderFromNumber(phone_number);
      if (!provider) {
        return res.status(400).json({
          success: false,
          message: "Nomor telepon tidak valid",
        });
      }
    }

    // Jika ada file logo baru yang di-upload
    if (req.file) {
      // Hapus file logo lama jika ada
      if (travelAgent.logo) {
        const oldLogoPath = travelAgent.logo.replace(/\\/g, "/");
        try {
          await fs.access(oldLogoPath);
          await fs.unlink(oldLogoPath);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.error("Gagal menghapus logo lama:", err);
          }
        }
      }
      // Perbarui path logo dengan yang baru
      travelAgent.logo = req.file.path.replace(/\\/g, "/");
    }

    // Update field-field lain
    if (travel_name) travelAgent.travel_name = travel_name;
    if (company_name) travelAgent.company_name = company_name;
    if (sk_number) travelAgent.sk_number = sk_number;
    if (phone_number) travelAgent.phone_number = phone_number;
    if (address) travelAgent.address = address;

    // perbarui email di travel agent dan di user
    if (email) {
      travelAgent.email = email;
      await db.User.update({ email }, { where: { id: userId } });
    }

    await travelAgent.save();

    res.json({
      success: true,
      message: "Profil travel berhasil diperbarui",
      data: travelAgent,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTravelAgent,
  getAllTravelAgents,
  getTravelAgent,
  updateTravelAgent,
  deleteTravelAgent,
  getTravelAgentForInfo,
  getTravelAgentProfile,
  updateTravelAgentProfile,
};
