// utils/logger.js (Siêu tối giản)

const winston = require("winston");
require("dotenv").config();

const nodeEnv = process.env.NODE_ENV || "development";
const logLevel =
  process.env.LOG_LEVEL || (nodeEnv === "production" ? "info" : "debug");

// Định dạng log cơ bản cho console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Timestamp đơn giản
  winston.format.errors({ stack: true }), // In stack trace nếu là lỗi
  winston.format.splat(),
  // Định dạng có màu cho môi trường dev, không màu cho prod
  nodeEnv === "development"
    ? winston.format.colorize()
    : winston.format.uncolorize(),
  // Định dạng log đơn giản: [Timestamp] level: message stack_trace (nếu có)
  winston.format.printf((info) => {
    const stack = info.stack ? `\n${info.stack}` : "";
    // Loại bỏ màu khỏi message trong production để tránh ký tự lạ
    const message =
      nodeEnv === "production"
        ? info.message.replace(/\u001b\[[0-9]{1,2}m/g, "")
        : info.message;
    return `[${info.timestamp}] ${info.level}: ${message}${stack}`;
  })
);

// Tạo logger chỉ với Console transport
const logger = winston.createLogger({
  level: logLevel, // Cấp độ log
  format: consoleFormat, // Chỉ dùng định dạng console
  transports: [
    new winston.transports.Console(), // Chỉ log ra console
    // Không cần handleExceptions/Rejections ở đây để giữ đơn giản,
    // server.js sẽ bắt chúng
  ],
  exitOnError: false,
});

// Stream cho Morgan (vẫn cần thiết)
logger.stream = {
  write: (message) => {
    // Log HTTP request với level 'http' (nếu level hiện tại cho phép)
    // Winston sẽ tự thêm timestamp và định dạng
    logger.log("http", message.trim());
  },
};

// Log khởi tạo đơn giản
logger.info(
  `Simple logger initialized. Mode: [${nodeEnv}], Level: [${logLevel}]`
);

module.exports = logger;
