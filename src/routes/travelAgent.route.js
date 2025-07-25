const express = require("express");
const router = express.Router();
const {
  createTravelAgent,
  getAllTravelAgents,
  getTravelAgent,
  updateTravelAgent,
  deleteTravelAgent,
  getTravelAgentForInfo,
  getTravelAgentProfile,
  updateTravelAgentProfile,
} = require("../controllers/travelAgent.controller");
const { registerTravelAgent } = require("../controllers/auth.controller");
const upload = require("../config/multer.config");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middlewares/auth.middleware");

router.post(
  "/",
  authMiddleware,
  upload.single("logo"),
  roleMiddleware(["admin"]),
  createTravelAgent
);
router.post("/register", upload.single("logo"), registerTravelAgent);

// Admin only routes
router.get("/", authMiddleware, roleMiddleware(["admin"]), getAllTravelAgents);
router.get("/info/:id", getTravelAgentForInfo);
router.get("/:id", authMiddleware, roleMiddleware(["admin"]), getTravelAgent);
router.put(
  "/:id",
  authMiddleware,
  upload.single("logo"),
  roleMiddleware(["admin"]),
  updateTravelAgent
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteTravelAgent
);

router.get(
  "/profile/:id",
  authMiddleware,
  roleMiddleware(["travel_agent"]),
  getTravelAgentProfile
);
router.put(
  "/profile/:id",
  authMiddleware,
  roleMiddleware(["travel_agent"]),
  upload.single("logo"),
  updateTravelAgentProfile
);

module.exports = router;
