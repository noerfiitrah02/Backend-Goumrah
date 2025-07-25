const express = require("express");
const router = express.Router();
const {
  createBlogCategory,
  getAllBlogCategories,
  getBlogCategoryBySlug,
  updateBlogCategory,
  deleteBlogCategory,
  createBlogPost,
  getAllBlogPosts,
  getFeaturedBlogPosts,
  getBlogPostBySlug,
  updateBlogPost,
  toggleFeatured,
  deleteBlogPost,
  createBlogTag,
  getAllBlogTags,
  getBlogTagBySlug,
  updateBlogTag,
  deleteBlogTag,
  getBlogPostsByTag,
  getPopularTags,
} = require("../controllers/blog.controller");
const upload = require("../config/multer.config");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

// Public routes - Categories
router.get("/categories", getAllBlogCategories);
router.get("/categories/:categorySlug", getBlogCategoryBySlug);

// Public routes - Tags
router.get("/tags", getAllBlogTags);
router.get("/tags/popular", getPopularTags);
router.get("/tags/:slug", getBlogTagBySlug);
router.get("/tags/:slug/posts", getBlogPostsByTag);

// Public routes - Posts
router.get("/", getAllBlogPosts);
router.get("/featured", getFeaturedBlogPosts);

// Public routes - Individual post by category and slug
// Format: /blog/:categorySlug/:postSlug
router.get("/:categorySlug/:postSlug", getBlogPostBySlug);

// Admin only routes - Categories
router.post(
  "/categories",
  authMiddleware,
  roleMiddleware(["admin"]),
  upload.single("featured_image"),
  createBlogCategory
);
router.put(
  "/categories/:categorySlug",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateBlogCategory
);
router.delete(
  "/categories/:categorySlug",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteBlogCategory
);

// Admin only routes - Tags
router.post("/tags", authMiddleware, roleMiddleware(["admin"]), createBlogTag);
router.put(
  "/tags/:slug",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateBlogTag
);
router.delete(
  "/tags/:slug",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteBlogTag
);

// Admin only routes - Posts
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  upload.single("featured_image"),
  createBlogPost
);

// Admin routes untuk update/delete post dengan format category/slug
router.put(
  "/:categorySlug/:postSlug",
  authMiddleware,
  roleMiddleware(["admin"]),
  upload.single("featured_image"),
  updateBlogPost
);
router.put(
  "/:categorySlug/:postSlug/featured",
  authMiddleware,
  roleMiddleware(["admin"]),
  toggleFeatured
);
router.delete(
  "/:categorySlug/:postSlug",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteBlogPost
);

module.exports = router;
