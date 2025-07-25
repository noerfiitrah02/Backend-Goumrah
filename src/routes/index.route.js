const express = require("express");
const router = express.Router();

const airlineRoute = require("./airline.route");
const authRouter = require("./auth.route");
const bankRoute = require("./bank.route");
const blogRoute = require("./blog.route");
const hotelRoute = require("./hotel.route");
const orderRoute = require("./order.route");
const packageRoute = require("./package.route");
const packageCategoryRoute = require("./packageCategory.route");
const travelAgentRoute = require("./travelAgent.route");
const userRoute = require("./user.route");
const dashboardRoute = require("./dashboard.route");

router.use("/airlines", airlineRoute);
router.use("/auth", authRouter);
router.use("/banks", bankRoute);
router.use("/blogs", blogRoute);
router.use("/hotels", hotelRoute);
router.use("/orders", orderRoute);
router.use("/packages", packageRoute);
router.use("/package-categories", packageCategoryRoute);
router.use("/travel", travelAgentRoute);
router.use("/users", userRoute);
router.use("/dashboard", dashboardRoute);

module.exports = router;
