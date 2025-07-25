const db = require("../models");
const { Op } = require("sequelize");
const upload = require("../config/multer.config");
const fs = require("fs").promises;
const path = require("path");

// Fungsi untuk membuat hotel baru
const createHotel = async (req, res, next) => {
  try {
    const {
      name,
      city,
      address,
      stars,
      description,
      facility,
      distance_to_haram,
      distance_to_nabawi,
      map_url,
    } = req.body;
    // Validasi nilai bintang hotel
    if (stars && (stars < 1 || stars > 5)) {
      return res.status(400).json({
        success: false,
        message: "Bintang hotel harus antara 1 sampai 5",
      });
    }
    // Buat record hotel baru di database
    const hotel = await db.Hotel.create({
      name,
      city,
      address,
      stars,
      description,
      facility,
      distance_to_haram,
      distance_to_nabawi,
      map_url,
    });
    // Kirim respons sukses dengan data hotel yang baru dibuat
    res.status(201).json({
      success: true,
      message: "Hotel berhasil ditambahkan",
      data: hotel,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menambahkan gambar ke hotel yang sudah ada
const addHotelImage = [
  upload.single("image_path"),
  async (req, res, next) => {
    try {
      // Cek apakah ada file yang di-upload
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "Tidak ada file yang diupload" });
      }
      const { id } = req.params;
      const { caption } = req.body;
      // Buat record gambar hotel baru yang terhubung dengan hotel_id
      const hotelImage = await db.HotelImage.create({
        hotel_id: id,
        image_path: req.file.path.replace(/\\/g, "/") || null,
        caption,
      });
      res.status(201).json({
        success: true,
        data: hotelImage,
      });
    } catch (error) {
      next(error);
    }
  },
];

// Fungsi untuk mendapatkan semua hotel dengan filter
const getAllHotels = async (req, res, next) => {
  try {
    // Ambil parameter query untuk filtering
    const { city, min_stars, max_stars, search } = req.query;
    const where = {};
    // Bangun klausa 'where' secara dinamis berdasarkan filter
    if (city) where.city = city;
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (min_stars || max_stars) {
      where.stars = {};
      if (min_stars) where.stars[Op.gte] = min_stars;
      if (max_stars) where.stars[Op.lte] = max_stars;
    }
    // Ambil semua hotel dari database sesuai filter
    const hotels = await db.Hotel.findAll({
      where,
      include: [
        {
          model: db.HotelImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
          limit: 1,
        },
      ],
    });
    // Kirim daftar hotel sebagai respons
    res.status(200).json({
      success: true,
      data: hotels,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mendapatkan satu hotel berdasarkan ID
const getHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Cari hotel berdasarkan ID dan sertakan gambar-gambarnya
    const hotel = await db.Hotel.findByPk(id, {
      include: [
        {
          model: db.HotelImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
        },
      ],
    });
    // Jika hotel tidak ditemukan, kirim error 404
    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, message: "Hotel tidak ditemukan" });
    }
    // Kirim data hotel yang ditemukan
    res.json({ success: true, data: hotel });
  } catch (error) {
    next(error);
  }
};

const updateHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // Validasi nilai bintang jika ada dalam data update
    if (updateData.stars && (updateData.stars < 1 || updateData.stars > 5)) {
      return res.status(400).json({
        success: false,
        message: "Bintang harus antara 1 sampai 5",
      });
    }
    // Lakukan update di database
    const [updated] = await db.Hotel.update(updateData, {
      where: { id },
    });
    // Jika tidak ada baris yang di-update, berarti hotel tidak ditemukan
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "hotel tidak ditemukan" });
    }
    // Ambil data hotel yang sudah di-update untuk respons
    const updatedHotel = await db.Hotel.findByPk(id);
    res.status(200).json({
      success: true,
      data: updatedHotel,
    });
  } catch (error) {
    next(error);
  }
};

const deleteHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Cari hotel yang akan dihapus
    const hotel = await db.Hotel.findByPk(id);
    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, message: "Hotel tidak ditemukan" });
    }
    // Cek apakah hotel ini masih digunakan di paket mana pun
    const packageHotelsCount = await db.PackageHotel.count({
      where: { hotel_id: id },
    });
    // Jika masih digunakan, tolak penghapusan
    if (packageHotelsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus hotel yang memiliki paket",
      });
    }
    // Hapus hotel dari database
    await hotel.destroy();
    res.status(200).json({
      success: true,
      message: "Hotel berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

const deleteHotelImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    // Cari gambar spesifik yang terhubung dengan hotel
    const image = await db.HotelImage.findOne({
      where: { id: imageId, hotel_id: id },
    });

    // Jika gambar tidak ditemukan, kirim error
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Foto tidak ditemukan",
      });
    }

    // Jika path gambar ada, coba hapus file dari server
    if (image.image_path) {
      const filePath = path.join(__dirname, "..", image.image_path);

      try {
        // Cek apakah file ada, lalu hapus
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log("File berhasil dihapus:", filePath);
      } catch (fileError) {
        // Tangani jika file tidak ditemukan atau error lainnya
        if (fileError.code === "ENOENT") {
          console.log("File tidak ditemukan:", filePath);
        } else {
          console.error("Error menghapus file:", fileError);
          return res.status(500).json({
            success: false,
            message: "Gagal menghapus file",
          });
        }
      }
    }

    // Hapus record gambar dari database
    await image.destroy();

    res.status(200).json({
      success: true,
      message: "Foto berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHotel,
  addHotelImage,
  getAllHotels,
  getHotel,
  updateHotel,
  deleteHotel,
  deleteHotelImage,
};
