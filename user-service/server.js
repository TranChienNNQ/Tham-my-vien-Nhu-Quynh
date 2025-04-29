// server.js (Tối giản - Nhấn mạnh NODE_ENV)

const http = require("http");
require("dotenv").config();

const app = require("./app"); // Import app đã được tối ưu
const logger = require("./utils/logger"); // Import logger
const db = require("./config/db.config"); // Import db config
const { on } = require("events");

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development"; // Xác định môi trường

const onListening = async () => {
  const addr = server.address();
  const bind =
    typeof addr.port === "string" ? "Pipe " + addr.port : "Port " + addr.port;
  const environment = process.env.NODE_ENV || "development";
  logger.info(`✅ Server is running in ${environment} mode`);
  logger.info(`Listening on ${bind}`);
  logger.info(`PID: ${process.pid}`);

  try {
    await db.testConnection(); // Kiểm tra kết nối cơ sở dữ liệu
    logger.info("✅ Database connection successful");
  } catch (error) {
    logger.error("❌ Error testing connection to the database:");
    logger.error(error.message); // Log lỗi nhưng không dừng server
    logger.warn("⚠️ Server is running without a database connection.");
  }
};

const server = http.createServer(app);

server.listen(PORT, () => {
  // Log thông tin quan trọng khi khởi động
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`   Mode: ${NODE_ENV}`); // Hiển thị môi trường đang chạy
  console.log(`   PID: ${process.pid}`);
  console.log(`   Access root at: http://localhost:${PORT}/`);
});

server.on("error", (error) => {
  // Giữ nguyên xử lý lỗi khởi động cơ bản
  if (error.syscall !== "listen") throw error;
  const bind = typeof PORT === "string" ? "Pipe " + PORT : "Port " + PORT;
  switch (error.code) {
    case "EACCES":
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

server.on("listening", onListening);

// --- Graceful Shutdown Logic ---
const gracefulShutdown = (signal) => {
  logger.warn(`👋 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info("✅ HTTP server closed.");
    try {
      if (db.pool) {
        await db.pool.end();
        logger.info("✅ Database connection pool closed.");
      }
    } catch (err) {
      logger.error("❌ Error during DB pool cleanup:", err);
    } finally {
      logger.info("Shutdown complete.");
      process.exit(0);
    }
  });

  setTimeout(() => {
    logger.error(
      "❌ Could not close connections in time, forcefully shutting down."
    );
    process.exit(1);
  }, 15000);
};

// --- Process Event Handlers ---
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception thrown:", error);
  gracefulShutdown("uncaughtException");
});

logger.info(`Server process starting with PID: ${process.pid}`);