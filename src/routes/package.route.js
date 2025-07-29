const express = require("express");
const router = express.Router();
const {
  createPackage,
  addPackageImage,
  addFlight,
  addHotel,
  addItinerary,
  getAllPackages,
  getMyPackages,
  getFeaturedPackages,
  getPopularPackages,
  getPackage,
  updatePackage,
  updatePackageStatus,
  toggleFeatured,
  deletePackage,
  deletePackageImage,
  deletePackageFlight,
  deletePackageHotel,
  deletePackageItinerary,
  getAllPackagesByTravelId,
} = require("../controllers/package.controller");
const upload = require("../config/multer.config");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

router.get("/", getAllPackages);
router.get(
  "/my-packages",
  authMiddleware,
  roleMiddleware(["travel_agent"]),
  getMyPackages
);

router.get("/featured", getFeaturedPackages);
router.get("/popular", getPopularPackages);
router.get("/travel/:travelId", getAllPackagesByTravelId);
router.get("/:id", getPackage);
router.post(
  "/:id/image",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  addPackageImage
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  upload.single("featured_image"),
  createPackage
);
router.post(
  "/:id/flight",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  addFlight
);
router.post(
  "/:id/hotel",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  addHotel
);
router.post(
  "/:id/itinerary",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  addItinerary
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  upload.single("featured_image"),
  updatePackage
);
router.put(
  "/:id/status",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  updatePackageStatus
);
router.put(
  "/:id/featured",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  toggleFeatured
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  deletePackage
);
router.delete(
  "/:id/images/:imageId",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  deletePackageImage
);
router.delete(
  "/:id/flights/:flightId",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  deletePackageFlight
);
router.delete(
  "/:id/hotels/:hotelId",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  deletePackageHotel
);
router.delete(
  "/:id/itineraries/:itineraryId",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  deletePackageItinerary
);

module.exports = router;
