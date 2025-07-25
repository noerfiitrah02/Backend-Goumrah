const express = require("express");
const router = express.Router();
const {
  createPackageCategory,
  getAllPackageCategories,
  getPackageCategory,
  updatePackageCategory,
  deletePackageCategory,
} = require("../controllers/packageCategory.controller");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

// Public routes
router.get("/", getAllPackageCategories);
router.get("/:id", getPackageCategory);

// Admin only routes
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  createPackageCategory
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  updatePackageCategory
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deletePackageCategory
);

module.exports = router;
