module.exports = {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  DB: process.env.DB_NAME,
  dialect: process.env.DB_DIALECT,
  pool: {
    max: 20, // Maksimal 20 koneksi
    min: 5, // Minimal 5 koneksi
    acquire: 30000, // Tunggu 30 detik untuk mendapat koneksi
    idle: 10000, // Koneksi idle maksimal 10 detik
    evict: 1000,
  },
};
