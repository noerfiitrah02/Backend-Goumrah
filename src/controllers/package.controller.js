const db = require("../models");
const { Op } = require("sequelize");
const upload = require("../config/multer.config");
const fs = require("fs").promises;

const createPackage = async (req, res, next) => {
  try {
    // Ambil semua data paket dari body request
    const {
      category_id,
      name,
      duration,
      price_double,
      price_tripple,
      price_quadraple,
      quota,
      departure_date,
      return_date,
      departure_city,
      includes,
      excludes,
      terms_conditions,
    } = req.body;

    // Validasi bahwa gambar utama (featured image) wajib di-upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Featured image wajib diupload",
      });
    }
    // Normalisasi path file gambar
    const featured_image = req.file.path.replace(/\\/g, "/");

    // Validasi tanggal keberangkatan dan kepulangan
    if (new Date(departure_date) >= new Date(return_date)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal keberangkatan harus sebelum tanggal pulang",
      });
    }
    // Buat record paket baru di database
    const package = await db.Package.create({
      category_id,
      name,
      duration,
      price_double,
      price_tripple,
      price_quadraple,
      quota,
      remaining_quota: quota,
      departure_date,
      return_date,
      departure_city,
      featured_image: featured_image,
      includes: typeof includes === "string" ? JSON.parse(includes) : includes,
      excludes: typeof excludes === "string" ? JSON.parse(excludes) : excludes,
      terms_conditions,
      created_by: req.user.id, // Set pembuat paket adalah user yang sedang login
      status: "draft",
    });
    res.status(201).json({
      success: true,
      message: "Paket berhasil dibuat",
      data: package,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menambahkan gambar ke paket yang sudah ada
const addPackageImage = [
  upload.single("image_path"),
  async (req, res, next) => {
    try {
      // Cek apakah ada file yang di-upload
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }
      const { id } = req.params;
      const { caption } = req.body;
      // Buat record gambar paket baru yang terhubung dengan package_id
      const packageImage = await db.PackageImage.create({
        package_id: id,
        image_path: req.file.path.replace(/\\/g, "/") || null,
        caption,
      });
      // Kirim respons sukses
      res.status(201).json({
        success: true,
        message: "Gambar berhasil ditambahkan",
        data: packageImage,
      });
    } catch (error) {
      next(error);
    }
  },
];

// Fungsi untuk menambahkan detail penerbangan ke paket
const addFlight = async (req, res, next) => {
  try {
    // Ambil ID paket dan detail penerbangan dari request
    const { id } = req.params;
    const {
      airline_id,
      flight_number,
      departure_airport,
      departure_datetime,
      arrival_airport,
      arrival_datetime,
      flight_type,
    } = req.body;
    // Validasi tipe penerbangan (hanya 'departure' atau 'return')
    if (!["departure", "return"].includes(flight_type)) {
      return res.status(400).json({
        success: false,
        message: "Tipe penerbangan harus 'departure' atau 'return'",
      });
    }
    // Validasi waktu keberangkatan dan kedatangan
    if (new Date(departure_datetime) >= new Date(arrival_datetime)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal keberangkatan harus sebelum tanggal pulang",
      });
    }

    // Buat record penerbangan baru untuk paket
    const flight = await db.PackageFlight.create({
      package_id: id,
      airline_id,
      flight_number,
      departure_airport,
      departure_datetime,
      arrival_airport,
      arrival_datetime,
      flight_type,
    });
    res.status(201).json({
      success: true,
      message: "Penerbangan berhasil ditambahkan",
      data: flight,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menambahkan detail hotel ke paket
const addHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hotel_id, check_in_date, check_out_date } = req.body;
    // Validasi tanggal check-in dan check-out
    if (new Date(check_in_date) >= new Date(check_out_date)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal Checkout harus sesudah Checkin",
      });
    }
    // Buat record hotel baru untuk paket
    const packageHotel = await db.PackageHotel.create({
      package_id: id,
      hotel_id,
      check_in_date,
      check_out_date,
    });
    // Kirim respons sukses
    res.status(201).json({
      success: true,
      message: "Hotel berhasil ditambahkan",
      data: packageHotel, // Menambahkan data ke respons agar konsisten
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menambahkan detail itinerary (rencana perjalanan) ke paket
const addItinerary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { day, title, description, location } = req.body;
    // Buat record itinerary baru untuk paket
    const itinerary = await db.PackageItinerary.create({
      package_id: id,
      day,
      title,
      description,
      location,
    });
    res.status(201).json({
      success: true,
      data: itinerary,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mendapatkan semua paket dengan berbagai filter
const getAllPackages = async (req, res, next) => {
  try {
    const {
      category_id,
      departure_city,
      min_price,
      max_price,
      departure_date_from,
      departure_date_to,
      status,
      is_featured,
      search,
      show_only_mine,
    } = req.query;

    // objek 'where' untuk query dinamis
    const where = {};

    // Filter untuk menampilkan paket milik user yang login saja
    // berguna kalo nanti mau nampilin paket travel atau admin doang di dashboard
    if (show_only_mine === "true") {
      where.created_by = req.user.id;
    }

    // Bangun klausa 'where' secara dinamis berdasarkan parameter query lainnya
    if (category_id) where.category_id = category_id;
    if (departure_city) where.departure_city = departure_city;
    if (status) where.status = status;
    if (is_featured) where.is_featured = is_featured === "true";
    // Filter berdasarkan rentang harga
    if (min_price || max_price) {
      where.price_double = {};
      if (min_price) where.price_double[Op.gte] = min_price;
      if (max_price) where.price_double[Op.lte] = max_price;
    }
    if (departure_date_from || departure_date_to) {
      where.departure_date = {};
      if (departure_date_from)
        where.departure_date[Op.gte] = departure_date_from;
      if (departure_date_to) where.departure_date[Op.lte] = departure_date_to;
    }
    // Filter berdasarkan pencarian teks
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { departure_city: { [Op.like]: `%${search}%` } },
      ];
    }

    // Ambil semua paket dari database sesuai filter
    const packages = await db.Package.findAll({
      where,
      // Sertakan data relasi seperti kategori, pembuat, gambar, dan hotel
      include: [
        {
          model: db.PackageCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: db.User,
          as: "creator",
          attributes: ["id", "name"],
        },

        {
          model: db.PackageImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
          limit: 1,
        },
        {
          model: db.PackageHotel,
          as: "hotels",
          include: [
            {
              model: db.Hotel,
              as: "hotel",
              attributes: ["id", "name", "stars"],
            },
          ],
        },
      ],
      order: [["departure_date", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mendapatkan paket milik travel agent yang sedang login
const getMyPackages = async (req, res, next) => {
  try {
    // Ambil semua parameter filter dari query
    const {
      category_id,
      departure_city,
      min_price,
      max_price,
      departure_date_from,
      departure_date_to,
      status,
      is_featured,
      search,
    } = req.query;

    // Kondisi utama: hanya paket yang dibuat oleh user ini
    const where = {
      created_by: req.user.id,
    };

    // Tambahkan filter lain secara dinamis
    if (category_id) where.category_id = category_id;
    if (departure_city) where.departure_city = departure_city;
    if (status) where.status = status;
    if (is_featured) where.is_featured = is_featured === "true";
    if (min_price || max_price) {
      where.price_double = {};
      if (min_price) where.price_double[Op.gte] = min_price;
      if (max_price) where.price_double[Op.lte] = max_price;
    }
    if (departure_date_from || departure_date_to) {
      where.departure_date = {};
      if (departure_date_from)
        where.departure_date[Op.gte] = departure_date_from;
      if (departure_date_to) where.departure_date[Op.lte] = departure_date_to;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { departure_city: { [Op.like]: `%${search}%` } },
      ];
    }

    // Jalankan query ke database
    const packages = await db.Package.findAll({
      where,
      // Sertakan relasi yang diperlukan
      include: [
        {
          model: db.PackageCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: db.User,
          as: "creator",
          attributes: ["id", "name"],
        },
        {
          model: db.PackageImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
          limit: 1,
        },
        {
          model: db.PackageHotel,
          as: "hotels",
          include: [
            {
              model: db.Hotel,
              as: "hotel",
              attributes: ["id", "name", "stars"],
            },
          ],
        },
      ],
      order: [["departure_date", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mendapatkan paket yang ditandai sebagai 'featured'
const getFeaturedPackages = async (req, res, next) => {
  try {
    const packages = await db.Package.findAll({
      // Kondisi: is_featured true dan status published
      where: {
        is_featured: true,
        status: "published",
      },
      include: [
        {
          model: db.PackageCategory,
          as: "category",
          attributes: ["id", "name"],
        },

        {
          model: db.PackageImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
          limit: 1,
        },
        {
          model: db.PackageHotel,
          as: "hotels",
          include: [
            {
              model: db.Hotel,
              as: "hotel",
              attributes: ["id", "name", "stars"],
            },
          ],
        },
      ],
      limit: 6,
      order: [["departure_date", "ASC"]],
    });
    res.status(200).json({
      success: true,
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mendapatkan satu paket berdasarkan ID dengan semua detailnya
const getPackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const package = await db.Package.findByPk(id, {
      // Sertakan semua relasi: kategori, pembuat, gambar, penerbangan, hotel, dan itinerary
      include: [
        {
          model: db.PackageCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: db.PackageImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
        },
        {
          model: db.PackageFlight,
          as: "flights",
          include: [
            {
              model: db.Airline,
              as: "airline",
              attributes: ["id", "name", "logo"],
            },
          ],
        },
        {
          model: db.PackageHotel,
          as: "hotels",
          include: [
            {
              model: db.Hotel,
              as: "hotel",
              include: [
                {
                  model: db.HotelImage,
                  as: "images",
                  attributes: ["id", "image_path", "caption"],
                },
              ],
            },
          ],
        },
        {
          model: db.PackageItinerary,
          as: "itineraries",
          attributes: ["id", "day", "title", "description", "location"],
        },
      ],
    });

    // Jika paket tidak ditemukan, kirim error 404
    if (!package) {
      return res
        .status(404)
        .json({ success: false, message: "Package tidak ditemukan" });
    }
    res.status(200).json({
      success: true,
      data: package,
    });
  } catch (error) {
    next(error);
  }
};

const getPopularPackages = async (req, res, next) => {
  try {
    // Query untuk mendapatkan package dengan jumlah order terbanyak
    const packages = await db.Package.findAll({
      where: {
        status: "published",
      },
      attributes: {
        include: [
          [
            db.sequelize.fn("COUNT", db.sequelize.col("orders.id")),
            "order_count",
          ],
        ],
      },
      include: [
        {
          model: db.Order,
          as: "orders",
          attributes: [], // Kosongkan attributes untuk menghindari konflik GROUP BY
          required: false, // LEFT JOIN
        },
      ],
      group: ["Package.id"], // Hanya group by Package.id
      order: [[db.sequelize.literal("order_count"), "DESC"]],
      limit: 1,
      subQuery: false,
    });

    // Jika tidak ada packages, return empty array
    if (packages.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Ambil ID packages yang sudah diurutkan dengan order_count
    const packageIdsWithCount = packages.map((pkg) => ({
      id: pkg.id,
      order_count: pkg.dataValues.order_count,
    }));

    const packageIds = packageIdsWithCount.map((item) => item.id);

    // Query terpisah untuk mendapatkan detail lengkap packages
    const detailedPackages = await db.Package.findAll({
      where: {
        id: {
          [Op.in]: packageIds,
        },
      },
      include: [
        {
          model: db.PackageCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: db.PackageImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
          limit: 1,
        },
        {
          model: db.PackageHotel,
          as: "hotels",
          include: [
            {
              model: db.Hotel,
              as: "hotel",
              attributes: ["id", "name", "stars"],
            },
          ],
        },
      ],
    });

    // Manual sorting berdasarkan urutan popularity dan tambahkan order_count
    const result = packageIdsWithCount
      .map((item) => {
        const pkg = detailedPackages.find((p) => p.id === item.id);
        if (pkg) {
          return {
            ...pkg.toJSON(),
            order_count: parseInt(item.order_count) || 0,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllPackagesByTravelId = async (req, res, next) => {
  try {
    const { travelId } = req.params;

    const packages = await db.Package.findAll({
      include: [
        {
          model: db.PackageCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: db.User,
          as: "creator",
          attributes: ["id", "name", "role"],
        },
        {
          model: db.TravelAgent,
          as: "travel",
          attributes: ["id", "travel_name", "phone_number", "email", "logo"],
        },
        {
          model: db.PackageImage,
          as: "images",
          attributes: ["id", "image_path", "caption"],
        },
        {
          model: db.PackageFlight,
          as: "flights",
          include: [
            {
              model: db.Airline,
              as: "airline",
              attributes: ["id", "name", "logo"],
            },
          ],
        },
        {
          model: db.PackageHotel,
          as: "hotels",
          include: [
            {
              model: db.Hotel,
              as: "hotel",
              include: [
                {
                  model: db.HotelImage,
                  as: "images",
                  attributes: ["id", "image_path", "caption"],
                  limit: 1,
                },
              ],
            },
          ],
        },
        {
          model: db.PackageItinerary,
          as: "itineraries",
          attributes: ["id", "day", "title", "description", "location"],
        },
      ],
    });

    // ✅ Filter hasil berdasarkan travel.id dari relasi
    const filtered = packages.filter((pkg) => pkg.travel?.id == travelId);

    res.status(200).json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk memperbarui data paket
const updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pkg = await db.Package.findByPk(id);

    // Jika paket tidak ditemukan
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package tidak ditemukan",
      });
    }

    // Cek otorisasi: hanya pembuat paket atau admin yang bisa mengedit
    if (pkg.created_by !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Tidak diperbolehkan mengubah paket ini",
      });
    }

    // Ambil data update dari body
    const {
      category_id,
      name,
      duration,
      price_double,
      price_tripple,
      price_quadraple,
      quota,
      departure_date,
      return_date,
      departure_city,
      includes,
      excludes,
      terms_conditions,
    } = req.body;

    // Validasi tanggal
    if (new Date(departure_date) >= new Date(return_date)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal keberangkatan harus sebelum tanggal pulang",
      });
    }

    // Siapkan objek data untuk di-update
    const updateData = {
      category_id,
      name,
      duration,
      price_double,
      price_tripple,
      price_quadraple,
      quota,

      departure_date,
      return_date,
      departure_city,
      includes: typeof includes === "string" ? JSON.parse(includes) : includes,
      excludes: typeof excludes === "string" ? JSON.parse(excludes) : excludes,
      terms_conditions,
    };

    // Jika ada file gambar baru yang di-upload
    if (req.file) {
      if (pkg.featured_image) {
        // Hapus file gambar lama dari server
        const oldPath = pkg.featured_image.replace(/\\/g, "/");
        try {
          await fs.access(oldPath);
          await fs.unlink(oldPath);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.error(
              "Gagal menghapus featured image lama (package):",
              err
            );
          }
        }
      }
      // Perbarui path gambar di data update
      updateData.featured_image = req.file.path.replace(/\\/g, "/");
    }

    // Lakukan update di database
    await pkg.update(updateData);

    res.json({
      success: true,
      message: "Package updated successfully",
      data: pkg,
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk memperbarui status paket (draft, published, archived)
const updatePackageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // Validasi nilai status yang diperbolehkan
    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status harus draft, published, atau archived",
      });
    }

    // jika paket belum memiliki itinerary, tolak pengubahan status ke published
    const itineraries = await db.PackageItinerary.findAll({
      where: { package_id: id },
    });
    if (status === "published" && itineraries.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Paket belum memiliki itinerary, tidak dapat diubah ke published",
      });
    }

    // jika paket belum memiliki package images, tolak pengubahan status ke published
    const images = await db.PackageImage.findAll({ where: { package_id: id } });
    if (status === "published" && images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Paket belum memiliki gambar, tidak dapat diubah ke published",
      });
    }

    // jika paket belum memiliki flight, tolak pengubahan status ke published
    const flights = await db.PackageFlight.findAll({
      where: { package_id: id },
    });
    if (status === "published" && flights.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Paket belum memiliki flight, tidak dapat diubah ke published",
      });
    }

    // jika paket belum memiliki hotel, tolak pengubahan status ke published
    const hotels = await db.PackageHotel.findAll({ where: { package_id: id } });
    if (status === "published" && hotels.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Paket belum memiliki hotel, tidak dapat diubah ke published",
      });
    }

    // Lakukan update status di database
    const [updated] = await db.Package.update(
      { status },
      {
        where: { id },
      }
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }
    res.status(200).json({
      success: true,
      message: "Package status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk mengubah status 'featured' pada paket
const toggleFeatured = async (req, res, next) => {
  try {
    const { id } = req.params;
    const package = await db.Package.findByPk(id);
    // Jika paket tidak ditemukan
    if (!package) {
      return res
        .status(404)
        .json({ success: false, message: "Paket tidak ditemukan" });
    }

    // jika status paket bukan "published", tolak pengubahan status ke featured
    if (package.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Paket harus dalam status published untuk diubah ke featured",
      });
    }

    // Balikkan nilai boolean is_featured
    await package.update({
      is_featured: !package.is_featured,
    });
    res.status(200).json({
      success: true,
      message: `Paket ${
        package.is_featured ? "ditambahkan ke" : "dihapus dari"
      } featured`,
      data: { is_featured: package.is_featured },
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menghapus paket
const deletePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pkg = await db.Package.findByPk(id);

    // Jika paket tidak ditemukan
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Paket tidak ditemukan",
      });
    }

    // Cek otorisasi: hanya pembuat paket atau admin yang bisa menghapus
    if (pkg.created_by !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Tidak diperbolehkan menghapus paket ini",
      });
    }

    // jika paket memiliki order, tolak penghapusan
    const orderCount = await db.Order.count({ where: { package_id: id } });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Paket memiliki pesanan, tidak dapat dihapus",
      });
    }

    // Jika ada gambar utama, hapus filenya dari server
    if (pkg.featured_image) {
      const imagePath = pkg.featured_image.replace(/\\/g, "/");
      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(
            "Gagal menghapus featured image saat delete package:",
            err
          );
        }
      }
    }

    // Hapus record paket dari database
    await pkg.destroy();

    res.json({
      success: true,
      message: "Paket berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menghapus gambar dari sebuah paket
const deletePackageImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    // Cari gambar spesifik yang terhubung dengan paket
    const image = await db.PackageImage.findOne({
      where: {
        id: imageId,
        package_id: id,
      },
    });

    // Jika gambar tidak ditemukan
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Gambar tidak ditemukan",
      });
    }

    // Hapus file gambar dari server
    const imagePath = image.image_path.replace(/\\/g, "/");
    try {
      await fs.access(imagePath);
      await fs.unlink(imagePath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error("Gagal menghapus package image:", err);
      }
    }

    // Hapus record gambar dari database
    await image.destroy();

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menghapus penerbangan dari sebuah paket
const deletePackageFlight = async (req, res, next) => {
  try {
    const { id, flightId } = req.params;
    // Cari penerbangan spesifik yang terhubung dengan paket
    const flight = await db.PackageFlight.findOne({
      where: {
        id: flightId,
        package_id: id,
      },
    });
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: "Penerbangan tidak ditemukan",
      });
    }
    // Hapus record penerbangan dari database
    await flight.destroy();
    res.status(200).json({
      success: true,
      message: "Penerbangan berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menghapus hotel dari sebuah paket
const deletePackageHotel = async (req, res, next) => {
  try {
    const { id, hotelId } = req.params;
    // Cari hotel spesifik yang terhubung dengan paket
    const packageHotel = await db.PackageHotel.findOne({
      where: {
        id: hotelId,
        package_id: id,
      },
    });
    if (!packageHotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel tidak ditemukan",
      });
    }
    // Hapus record hotel dari database
    await packageHotel.destroy();
    res.status(200).json({
      success: true,
      message: "Hotel berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk menghapus itinerary dari sebuah paket
const deletePackageItinerary = async (req, res, next) => {
  try {
    const { id, itineraryId } = req.params;
    // Cari itinerary spesifik yang terhubung dengan paket
    const itinerary = await db.PackageItinerary.findOne({
      where: {
        id: itineraryId,
        package_id: id,
      },
    });

    // Jika itinerary tidak ditemukan
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        message: "Itinerary tidak ditemukan",
      });
    }
    // Hapus record itinerary dari database
    await itinerary.destroy();
    res.status(200).json({
      success: true,
      message: "Itinerari berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPackage,
  addPackageImage,
  addFlight,
  addHotel,
  addItinerary,
  getAllPackages,
  getMyPackages,
  getFeaturedPackages,
  getPackage,
  getPopularPackages,
  getAllPackagesByTravelId,
  updatePackage,
  updatePackageStatus,
  toggleFeatured,
  deletePackage,
  deletePackageImage,
  deletePackageFlight,
  deletePackageHotel,
  deletePackageItinerary,
};
