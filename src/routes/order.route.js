const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getUserOrders,
} = require("../controllers/order.controller");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

router.post("/", authMiddleware, createOrder);

// route user
router.get(
  "/user-orders",
  authMiddleware,
  roleMiddleware(["user"]),
  getUserOrders
);

router.get("/:id", authMiddleware, getOrder);

// route admin dan travel agent
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "travel_agent"]),
  getAllOrders
);
router.put("/:id/status", authMiddleware, updateOrderStatus);
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), deleteOrder);

module.exports = router;
