require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./src/models");
const apiRoute = require("./src/routes/index.route");
const errorMiddleware = require("./src/middlewares/error.middleware");
const PORT = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

db.sequelize
  .sync({ alter: false })
  .then(() => console.log("Database connected"))
  .catch((err) => console.log("Database connection error: ", err));

// Api Routes
app.use("/api", apiRoute);

// Home Routes
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Goumroh api is running cuy",
  });
});

// Error Handling Middleware
app.use(errorMiddleware);

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
