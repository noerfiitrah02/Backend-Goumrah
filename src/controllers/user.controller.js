const db = require("../models");
const bcrypt = require("bcryptjs");
const sequelize = require("sequelize");
const { Op } = require("sequelize");
const { getProviderFromNumber } = require("../utils/phoneValidation.js");

// Fungsi untuk membuat user baru (biasanya oleh admin)
const createUser = async (req, res, next) => {
  try {
    // Ambil semua data yang diperlukan dari body request
    const {
      name,
      email,
      password,
      phone_number,
      address,
      nik,
      birth_date,
      birth_place,
      is_using_bank_financing = false,
      bank_id,
      role = "user",
      status = "pending",
    } = req.body;

    // Validasi field wajib
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Nama wajib diisi",
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }

    // Validasi format email menggunakan regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    // Cek apakah email sudah digunakan oleh user lain
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Validasi nomor telepon menggunakan utilitas
    if (phone_number) {
      const provider = getProviderFromNumber(phone_number);
      if (!provider) {
        return res.status(400).json({
          success: false,
          message: "Nomor telepon tidak valid",
        });
      }
    }

    const existingNik = await db.User.findOne({ where: { nik } });
    if (existingNik) {
      return res.status(400).json({
        success: false,
        message: "NIK sudah terdaftar",
      });
    }

    const existingPhoneNumber = await db.User.findOne({
      where: { phone_number },
    });
    if (existingPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon sudah terdaftar",
      });
    }

    // Validasi jika user memilih pembiayaan bank, bank_id harus ada
    if (is_using_bank_financing && !bank_id) {
      return res.status(400).json({
        success: false,
        message: "Bank ID wajib diisi jika menggunakan pembiayaan bank",
      });
    }

    // Hash password sebelum disimpan ke database untuk keamanan
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat record user baru di database
    const newUser = await db.User.create({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      phone_number: phone_number ? phone_number.trim() : null,
      address: address ? address.trim() : null,
      nik: nik ? nik.trim() : null,
      birth_date: birth_date || null,
      birth_place: birth_place ? birth_place.trim() : null,
      is_using_bank_financing,
      bank_id: is_using_bank_financing ? bank_id : null,
      role,
      status,
    });

    // Ambil data user yang baru dibuat (tanpa password) untuk respons
    const createdUser = await db.User.findByPk(newUser.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.Bank,
          as: "bank",
          attributes: ["id", "bank_name", "logo"],
        },
      ],
    });

    // Kirim respons sukses dengan data user yang baru dibuat
    res.status(201).json({
      success: true,
      message: "User berhasil dibuat",
      data: createdUser,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mendapatkan semua user dengan filter
const getAllUsers = async (req, res, next) => {
  try {
    // Ambil parameter query untuk filtering dan pencarian
    const { role, status, search } = req.query;
    const where = {};

    // Bangun klausa 'where' secara dinamis berdasarkan parameter query
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
      ];
    }

    // Ambil semua user dari database sesuai filter
    const users = await db.User.findAll({
      where,
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.TravelAgent,
          as: "travelAgent",
          attributes: ["id", "travel_name"],
        },
        {
          model: db.Bank,
          as: "bank",
          attributes: ["id", "bank_name"],
        },
      ],
    });

    // Kirim daftar user sebagai respons
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    // Ambil satu user berdasarkan ID dari parameter URL
    const user = await db.User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.TravelAgent,
          as: "travelAgent",
          attributes: ["id", "travel_name", "company_name", "sk_number"],
        },
        {
          model: db.Bank,
          as: "bank",
          attributes: ["id", "bank_name", "logo"],
        },
      ],
    });

    // Jika user tidak ditemukan, kirim error 404
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    // Kirim data user yang ditemukan
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    // Ambil ID user dan data untuk di-update
    const { id } = req.params;
    const updateData = req.body;

    // Cegah perubahan password melalui endpoint ini untuk keamanan
    if (updateData.password) {
      return res.status(403).json({
        success: false,
        message: "Tidak bisa mengubah password melalui endpoint ini",
      });
    }

    // Validasi nomor telepon jika ada di dalam data update
    if (updateData.phone_number) {
      const provider = getProviderFromNumber(updateData.phone_number);
      if (!provider) {
        return res.status(400).json({
          success: false,
          message:
            "Nomor telepon tidak valid. Pastikan nomor yang Anda masukkan adalah nomor provider Indonesia yang aktif.",
        });
      }
    }

    // Lakukan update di database
    const [updated] = await db.User.update(updateData, {
      where: { id },
    });

    // Jika tidak ada baris yang di-update, berarti user tidak ditemukan
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    // Ambil data user yang sudah di-update untuk respons
    const updatedUser = await db.User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    // Kirim respons sukses
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  // Gunakan transaksi untuk memastikan konsistensi data
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;

    const user = await db.User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    if (user.role === "admin") {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Tidak bisa menghapus user admin",
      });
    }

    // Cek relasi dengan tabel lain sebelum menghapus
    const orderCount = await db.Order.count({
      where: { user_id: id },
      transaction,
    });
    if (orderCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Tidak bisa menghapus user yang memiliki riwayat pesanan.",
      });
    }

    const packageCount = await db.Package.count({
      where: { created_by: id },
      transaction,
    });
    if (packageCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Tidak bisa menghapus user yang telah membuat paket.",
      });
    }

    const blogPostCount = await db.BlogPost.count({
      where: { author_id: id },
      transaction,
    });
    if (blogPostCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Tidak bisa menghapus user yang memiliki postingan blog. Pertimbangkan untuk menonaktifkan akun.",
      });
    }

    // Jika user adalah travel agent, hapus juga data di tabel TravelAgent
    if (user.role === "travel_agent") {
      await db.TravelAgent.destroy({ where: { user_id: id }, transaction });
    }

    await user.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: "User berhasil dihapus" });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validasi nilai status yang diperbolehkan
    if (!["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status harus active, inactive, atau pending",
      });
    }

    // Cek apakah user dengan ID tersebut ditemukan
    const user = await db.User.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    // Update status user di database
    const [updated] = await db.User.update(
      { status },
      {
        where: { id },
      }
    );

    // Jika tidak ada yang di-update, user tidak ditemukan
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    // Kirim pesan sukses
    res.json({ success: true, message: "User status berhasil diubah" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserStatus,
};
