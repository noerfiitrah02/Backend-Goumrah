const express = require("express");
const router = express.Router();
const {
  forgotPassword,
  resetPassword,
  sendRegistrationOTP,
  verifyRegistrationOTP,
  completeRegistration,
  completeProfile,
  login,
  getMe,
  registerTravelAgent,
} = require("../controllers/auth.controller");
const {
  authMiddleware,
  validateRegistrationToken,
} = require("../middlewares/auth.middleware");

// Route untuk multi step registrasi
router.post("/register/step1", sendRegistrationOTP);
router.post("/register/step2", verifyRegistrationOTP);
router.post("/register/step3", completeRegistration);
router.put("/complete-profile", validateRegistrationToken, completeProfile);

router.post("/register/travel", registerTravelAgent);

// Route Authentikasi
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authMiddleware, getMe);

module.exports = router;
