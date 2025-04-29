// app.js (CORS đơn giản, 404 không dùng app.all)

const express = require("express");
const helmet = require("helmet");
const cors = require("cors"); // Import cors
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");

const AppError = require("./utils/appError");
const logger = require("./utils/logger");
const globalErrorHandler = require("./controllers/error.controller"); // Vẫn comment out
const apiRouter = require('./routes/index');
const app = express();

// --- MIDDLEWARES ---

// app.enable("trust proxy");
app.set("trust proxy", "loopback");
app.use(compression());
app.use(helmet());

// 4. CORS: Sử dụng cách đơn giản nhất
app.use(cors()); // Cho phép tất cả origin, xử lý pre-flight cơ bản

// 5. Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: "fail",
    message:
      "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter); // Áp dụng cho tất cả

// 6. HTTP Request Logging
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined", { stream: logger.stream }));
} else {
  app.use(morgan("dev", { stream: logger.stream }));
}
//7. Body parsing 
app.use(express.json({ limit: process.env.BODY_LIMIT || '10kb' }));
// --- ROUTES ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  logger.info(`Request to / from IP: ${req.ip}`, {
    userAgent: req.headers["user-agent"],
  });
  res
    .status(200)
    .send("hello, Đây là khởi đầu cho 1 siêu ứng dụngdụng");
});
app.use('/api/v1', apiRouter);

// --- ERROR HANDLING ---

// 1. Middleware bắt các request không khớp route nào (thay thế app.all('*', ...))
// Đặt middleware này SAU tất cả các route hợp lệ và TRƯỚC error handler cuối cùng
app.use((req, res, next) => {
  // Nếu request chạy đến đây mà không có route nào khớp ở trên, tạo lỗi 404
  next(
    new AppError(
      `Can't find ${req.method} ${req.originalUrl} on this server!`,
      404
    )
  );
});

// 2. Fallback Global Error Handling Middleware (Vẫn dùng tạm fallback)
// Middleware này sẽ bắt lỗi từ các route hoặc từ handler 404 ở trên
app.use((err, req, res, next) => {
  logger.error(`💥 FALLBACK ERROR HANDLER 💥: ${err.message}`, {
    stack: err.stack,
    errorObject: err,
  });
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Lỗi không xác định
  return res.status(500).json({
    status: "error",
    message: "Internal Server Error (Fallback)",
  });
});
app.use(globalErrorHandler);

// Export app
module.exports = app;
