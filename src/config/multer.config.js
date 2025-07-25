const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Konfigurasi penyimpanan file di disk menggunakan multer.diskStorage
const storage = multer.diskStorage({
  // Fungsi untuk menentukan folder tujuan upload secara dinamis
  destination: (req, file, cb) => {
    let uploadPath = "uploads/images/";

    // Logika untuk upload 'logo' berdasarkan rute (airline, travel, bank)
    if (file.fieldname === "logo") {
      if (req.baseUrl.includes("airlines")) uploadPath += "airline/";
      else if (req.baseUrl.includes("travel")) uploadPath += "travel/";
      else if (req.baseUrl.includes("banks")) uploadPath += "bank/";
    }
    // Logika untuk upload 'featured_image' (paket, blog)
    else if (file.fieldname === "featured_image") {
      if (req.baseUrl.includes("packages")) uploadPath += "package/";
      else if (req.baseUrl.includes("blogs")) uploadPath += "blog/";
    }
    // Logika untuk upload 'image_path' umum (hotel, gambar paket)
    else if (file.fieldname === "image_path") {
      if (req.baseUrl.includes("hotels")) uploadPath += "hotel/";
      else if (req.baseUrl.includes("packages")) uploadPath += "packageimage/";
    }

    // Buat direktori tujuan jika belum ada
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  // Fungsi untuk menghasilkan nama file yang unik untuk menghindari penimpaan
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      // Format nama file: fieldname-timestampunik.ekstensi
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Filter untuk hanya mengizinkan tipe file gambar tertentu (jpeg, png, jpg)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG and GIF are allowed!"),
      false
    );
  }
};

// Inisialisasi multer dengan konfigurasi storage, filter, dan batas ukuran file
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batas ukuran file 5MB
});

module.exports = upload;
