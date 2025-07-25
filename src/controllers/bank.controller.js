const fs = require("fs").promises; // Menggunakan fs.promises
const db = require("../models");

const createBank = async (req, res, next) => {
  try {
    const { bank_name } = req.body;

    const bankData = {
      bank_name,
      logo: req.file ? req.file.path.replace(/\\/g, "/") : null,
    };

    const bank = await db.Bank.create(bankData);

    res.status(201).json({
      success: true,
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

const getAllBanks = async (req, res, next) => {
  try {
    const banks = await db.Bank.findAll();
    res.status(200).json({
      success: true,
      data: banks,
    });
  } catch (error) {
    next(error);
  }
};

const getBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bank = await db.Bank.findByPk(id);
    if (!bank) {
      return res
        .status(404)
        .json({ success: false, message: "Bank tidak ditemukan" });
    }
    res.status(200).json({
      success: true,
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

const updateBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bank_name } = req.body;

    const bank = await db.Bank.findByPk(id);
    if (!bank) {
      return res
        .status(404)
        .json({ success: false, message: "Bank tidak ditemukan" });
    }

    if (req.file) {
      if (bank.logo) {
        const oldLogoPath = bank.logo.replace(/\\/g, "/");
        try {
          await fs.access(oldLogoPath); // Cek apakah file ada
          await fs.unlink(oldLogoPath); // Hapus file secara asynchronous
        } catch (err) {
          // Abaikan error jika file tidak ada (ENOENT), atau log jika perlu
          if (err.code !== "ENOENT") {
            console.error("Gagal menghapus logo lama bank:", err);
            // Pertimbangkan untuk tidak menggagalkan seluruh operasi hanya karena gagal hapus file lama
          }
        }
      }
      bank.logo = req.file.path.replace(/\\/g, "/");
    }

    if (bank_name) bank.bank_name = bank_name; // Menggunakan bank_name

    await bank.save();

    res.status(200).json({
      success: true,
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

const deleteBank = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bank = await db.Bank.findByPk(id);
    if (!bank) {
      return res
        .status(404)
        .json({ success: false, message: "Bank tidak ditemukan" });
    }

    if (bank.logo) {
      const logoPath = bank.logo.replace(/\\/g, "/");
      try {
        await fs.access(logoPath);
        await fs.unlink(logoPath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Gagal menghapus logo saat delete bank:", err);
        }
      }
    }

    await bank.destroy();

    res.status(200).json({ success: true, message: "Bank berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBank,
  getAllBanks,
  getBank,
  updateBank,
  deleteBank,
};
