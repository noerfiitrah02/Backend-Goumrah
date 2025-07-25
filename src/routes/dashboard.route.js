const express = require("express");
const router = express.Router();

const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

const {
  dashboardAdmin,
  dashboardTravelAgent,
} = require("../controllers/dashboard.controller");

// route dashboard admin
router.get("/admin", authMiddleware, roleMiddleware(["admin"]), dashboardAdmin);

// route dashboard travel agent
router.get(
  "/travel-agent",
  authMiddleware,
  roleMiddleware(["travel_agent"]),
  dashboardTravelAgent
);

module.exports = router;
