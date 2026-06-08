const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const routes = require("./routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    message: "T-Rent Backend API",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "T-Rent Backend",
  });
});

app.use("/api", routes);

app.use(errorMiddleware);

module.exports = app;