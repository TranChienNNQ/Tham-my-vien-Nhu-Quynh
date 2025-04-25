// server.js (Tối giản - Nhấn mạnh NODE_ENV)

const http = require("http");
require("dotenv").config();

const app = require("./app"); // Import app đã được tối ưu

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development"; // Xác định môi trường

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

// Lưu ý: Các handler `uncaughtException`, `unhandledRejection`, `SIGTERM`
// rất quan trọng cho production, nhưng tạm thời bỏ qua để giữ sự đơn giản.
// Chúng ta sẽ thêm lại khi xây dựng phiên bản hoàn chỉnh.
