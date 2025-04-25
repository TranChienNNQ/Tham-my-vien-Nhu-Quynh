// utils/appError.js

class AppError extends Error {
  constructor(message, statusCode) {
    // Đảm bảo message luôn là string
    super(String(message));

    this.statusCode = statusCode || 500; // Mặc định là lỗi server nếu không rõ
    this.status = `${this.statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Lỗi dự kiến, không phải bug code

    // Ghi lại stack trace đúng cách
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
