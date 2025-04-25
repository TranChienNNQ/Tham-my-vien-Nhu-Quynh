// controllers/error.controller.js

const AppError = require("../utils/appError");
const logger = require("../utils/logger");

// ----- Helper Functions for Specific Error Types -----

// Xử lý lỗi unique constraint của PostgreSQL (vd: trùng username/email) - Mã lỗi 23505
const handlePgDuplicateKeyError = (err) => {
  const valueMatch = err.detail?.match(/\((.*?)\)=\((.*?)\)/);
  const field = valueMatch ? valueMatch[1] : "field";
  const value = valueMatch ? valueMatch[2] : "value";
  const message = `Duplicate ${field} value: "${value}". Please use another value!`;
  return new AppError(message, 400); // 400 Bad Request
};

// Xử lý lỗi validation chung của PostgreSQL (vd: check constraint - 23514, not null - 23502)
// Hoặc lỗi sai kiểu dữ liệu (vd: invalid input syntax - 22P02)
const handlePgValidationError = (err) => {
  let message = "Invalid input data.";
  // Cố gắng trích xuất thông tin hữu ích hơn từ lỗi DB nếu có
  if (err.constraint === "check_violation") {
    message = `Check constraint violated: ${err.constraint}. ${
      err.detail || ""
    }`;
  } else if (err.code === "22P02") {
    message = `Invalid input syntax for type. ${err.detail || ""}`;
  } else if (err.detail) {
    message = `Database validation failed: ${err.detail}`;
  } else {
    message = err.message || message; // Lấy message gốc nếu có
  }
  return new AppError(message, 400); // 400 Bad Request
};

// Xử lý lỗi Foreign Key constraint của PostgreSQL (không tìm thấy bản ghi tham chiếu) - Mã lỗi 23503
const handlePgForeignKeyError = (err) => {
  const detailMatch = err.detail?.match(
    /Key \((.*?)\)=\((.*?)\) is not present in table "(.*?)"./
  );
  let message = "A related record was not found.";
  if (detailMatch) {
    message = `Invalid reference: The value '${detailMatch[2]}' for field '${detailMatch[1]}' does not exist in '${detailMatch[3]}'.`;
  } else if (err.detail) {
    message = `Invalid reference: ${err.detail}`;
  }
  return new AppError(message, 400); // 400 Bad Request
};

// Xử lý lỗi JWT không hợp lệ (sai signature)
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401); // 401 Unauthorized

// Xử lý lỗi JWT hết hạn
const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401); // 401 Unauthorized

// ----- Error Sending Functions -----

// Gửi lỗi chi tiết cho môi trường Development
const sendErrorDev = (err, req, res) => {
  // Log lỗi đầy đủ để debug
  logger.error("DEV ERROR:", {
    message: err.message,
    error: err, // Log cả object lỗi
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(err.statusCode || 500).json({
    status: err.status || "error",
    error: { ...err, stack: err.stack }, // Bao gồm stack trace
    message: err.message,
  });
};

// Gửi lỗi đã được xử lý cho môi trường Production
const sendErrorProd = (err, req, res) => {
  // A) Lỗi Operational (dự kiến): Gửi thông báo thân thiện cho client
  if (err.isOperational) {
    logger.warn(`Operational Error: ${err.message}`, {
      // Log ở mức warn
      statusCode: err.statusCode,
      status: err.status,
      path: req.originalUrl,
      method: req.method,
      // Không cần log stack cho lỗi operational
    });
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // B) Lỗi Lập trình hoặc Không xác định: Log chi tiết, gửi thông báo chung
  // 1) Log lỗi nghiêm trọng này
  logger.error("PRODUCTION ERROR (Non-Operational):", {
    message: err.message,
    errorObject: err, // Log object lỗi gốc để xem chi tiết (như DB error code)
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // 2) Gửi response chung chung
  return res.status(500).json({
    status: "error",
    message: "Something went very wrong! Our team has been notified.",
  });
};

// ----- Global Error Handling Middleware -----

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = {
      ...err,
      message: err.message,
      name: err.name,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
    }; // Copy các thuộc tính cần thiết

    // Xử lý lỗi cụ thể của PostgreSQL
    if (error.code === "23505") error = handlePgDuplicateKeyError(error);
    if (error.code === "23503") error = handlePgForeignKeyError(error);
    if (
      error.code?.startsWith("22") ||
      error.code === "23514" ||
      error.code === "23502"
    )
      error = handlePgValidationError(error);

    // Xử lý lỗi JWT
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    // Xử lý các lỗi validation từ thư viện khác nếu cần
    // if (error.isJoi === true) error = handleJoiValidationError(error);

    sendErrorProd(error, req, res);
  } else {
    // Môi trường không xác định
    logger.error("Unknown environment error:", err);
    res
      .status(500)
      .json({ status: "error", message: "An unexpected error occurred." });
  }
};

module.exports = globalErrorHandler;
