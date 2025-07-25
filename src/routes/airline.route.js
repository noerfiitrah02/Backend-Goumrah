const express = require("express");
const router = express.Router();
const {
  createAirline,
  getAllAirlines,
  getAirline,
  updateAirline,
  deleteAirline,
} = require("../controllers/airline.controller");
const upload = require("../config/multer.config");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", getAllAirlines);
router.get("/:id", getAirline);

// Admin only routes
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  upload.single("logo"),
  createAirline
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  upload.single("logo"),
  updateAirline
);
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), deleteAirline);

module.exports = router;
