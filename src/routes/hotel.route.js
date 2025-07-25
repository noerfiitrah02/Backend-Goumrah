const express = require("express");
const router = express.Router();
const {
  createHotel,
  addHotelImage,
  getAllHotels,
  getHotel,
  updateHotel,
  deleteHotel,
  deleteHotelImage,
} = require("../controllers/hotel.controller");
const upload = require("../config/multer.config");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", getAllHotels);
router.get("/:id", getHotel);

// Admin only routes
router.post("/", authMiddleware, roleMiddleware(["admin"]), createHotel);
router.put("/:id", authMiddleware, roleMiddleware(["admin"]), updateHotel);
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), deleteHotel);
router.post(
  "/:id/image",
  authMiddleware,
  roleMiddleware(["admin"]),
  addHotelImage
);
router.delete(
  "/:id/images/:imageId",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteHotelImage
);

module.exports = router;
