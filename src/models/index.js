const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const dbConfig = require("../config/db.config");
const db = {};

// Inisialisasi koneksi Sequelize dengan konfigurasi dari db.config.js
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});

// Baca semua file di direktori saat ini (models)
fs.readdirSync(__dirname)
  // Filter file untuk memastikan itu adalah file model JavaScript yang valid
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  // Impor dan inisialisasi setiap model
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    // Tambahkan model yang sudah diinisialisasi ke objek db
    db[model.name] = model;
  });

// Jalankan fungsi 'associate' untuk setiap model jika ada, untuk membuat relasi antar tabel
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Ekspor instance sequelize dan Sequelize itu sendiri untuk digunakan di tempat lain
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Ekspor objek db yang berisi semua model yang telah dimuat
module.exports = db;
