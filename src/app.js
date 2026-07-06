const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

const danhSachCors = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: danhSachCors,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "T-Rent Backend đang chạy",
  });
});

app.use("/api", routes);

module.exports = app;