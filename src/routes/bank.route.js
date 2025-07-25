const express = require("express");
const router = express.Router();
const {
  createBank,
  getAllBanks,
  getBank,
  updateBank,
  deleteBank,
} = require("../controllers/bank.controller");
const upload = require("../config/multer.config");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", getAllBanks);
router.get("/:id", getBank);

// Admin only routes
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), deleteBank);
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  upload.single("logo"),
  createBank
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  upload.single("logo"),
  updateBank
);

module.exports = router;
