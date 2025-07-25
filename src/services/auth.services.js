const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// menghasilkan hash
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// membandingkan password dan hash
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// menghasilkan JWT
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Verifikasi Jwt
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
