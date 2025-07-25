const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateUserStatus,
} = require("../controllers/user.controller");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

// Existing admin routes
router.post("/", authMiddleware, roleMiddleware(["admin"]), createUser);
router.get("/", authMiddleware, roleMiddleware(["admin"]), getAllUsers);
router.get("/:id", authMiddleware, roleMiddleware(["admin"]), getUser);
router.put("/:id", authMiddleware, roleMiddleware(["admin"]), updateUser);
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), deleteUser);
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateUserStatus
);

module.exports = router;
