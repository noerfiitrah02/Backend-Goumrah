const db = require("../models");
const fs = require("fs");

const createAirline = async (req, res, next) => {
  try {
    const { name } = req.body;

    const airlineData = {
      name,
      logo: req.file ? req.file.path.replace(/\\/g, "/") : null,
    };

    const airline = await db.Airline.create(airlineData);

    res.status(201).json({
      success: true,
      data: airline,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAirlines = async (req, res, next) => {
  try {
    const airlines = await db.Airline.findAll();
    // res.json({ success: true, data: airlines });
    res.status(200).json({
      success: true,
      data: airlines,
    });
  } catch (error) {
    next(error);
  }
};

// Get single airline
const getAirline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const airline = await db.Airline.findByPk(id, {
      include: [
        {
          model: db.PackageFlight,
          as: "flights",
          attributes: [
            "id",
            "flight_number",
            "departure_airport",
            "arrival_airport",
          ],
          required: false,
        },
      ],
    });
    if (!airline) {
      return res
        .status(404)
        .json({ success: false, message: "Airline tidak ditemukan" });
    }
    res.status(200).json({
      success: true,
      data: airline,
    });
  } catch (error) {
    next(error);
  }
};

const updateAirline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const airline = await db.Airline.findByPk(id);
    if (!airline) {
      return res
        .status(404)
        .json({ success: false, message: "Airline tidak ditemukan" });
    }

    // Jika ada logo baru diupload
    if (req.file) {
      // Hapus logo lama dari server jika ada
      if (airline.logo) {
        const oldLogoPath = airline.logo.replace(/\\/g, "/");
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      // Simpan logo baru (ganti path ke format slash)
      airline.logo = req.file.path.replace(/\\/g, "/");
    }

    // Update nama jika disediakan
    if (name) airline.name = name;

    await airline.save();

    res.status(200).json({
      success: true,
      data: airline,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAirline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const airline = await db.Airline.findByPk(id);
    if (!airline) {
      return res
        .status(404)
        .json({ success: false, message: "Airline tidak ditemukan" });
    }

    // Cek relasi dulu
    const flightsCount = await db.PackageFlight.count({
      where: { airline_id: id },
    });
    if (flightsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus airline yang memiliki paket",
      });
    }

    if (airline.logo) {
      const logoPath = airline.logo.replace(/\\/g, "/");
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    await airline.destroy();

    res.json({ success: true, message: "Airline berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAirline,
  getAllAirlines,
  getAirline,
  updateAirline,
  deleteAirline,
};
