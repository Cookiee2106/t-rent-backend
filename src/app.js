const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const protectedFileRoutes = require("./modules/protectedFiles/protectedFileRoutes");

const app = express();

app.set("trust proxy", 1);

const danhSachCors = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: danhSachCors,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "T-Rent Backend đang chạy",
  });
});

app.use("/api/protected-files", protectedFileRoutes);
app.use("/api", routes);

module.exports = app;