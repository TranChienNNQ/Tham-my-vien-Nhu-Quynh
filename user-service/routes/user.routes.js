// routes/user.routes.js

const express = require('express');
const userController = require('../controllers/user.controller'); // Import user controller
// const authMiddleware = require('../middlewares/auth.middleware'); // Sẽ import sau khi có auth

// Tạo một instance của Express Router
const router = express.Router();

// --- Định nghĩa các Routes cho User ---
// Lưu ý: Chúng ta sẽ thêm middleware xác thực/phân quyền (vd: authMiddleware.protect, authMiddleware.restrictTo('admin')) vào các route này sau khi xây dựng xong phần Auth.

// Nhóm các routes cho đường dẫn gốc '/' (vd: /api/v1/users)
router
    .route('/')
    .get(
        // authMiddleware.protect, // Sẽ thêm sau
        // authMiddleware.restrictTo('admin', 'manager'), // Ví dụ: Chỉ admin/manager được xem list
        userController.getAllUsers
    ) // GET /: Lấy danh sách users
    .post(
        // authMiddleware.protect, // Sẽ thêm sau
        // authMiddleware.restrictTo('admin'), // Ví dụ: Chỉ admin được tạo user mới
        userController.createUser
    ); // POST /: Tạo user mới

// Nhóm các routes cho đường dẫn '/:id' (vd: /api/v1/users/123)
router
    .route('/:id')
    .get(
        // authMiddleware.protect, // Sẽ thêm sau
        // Có thể thêm logic kiểm tra quyền xem user cụ thể (vd: admin hoặc chính user đó)
        userController.getUserById
    )    // GET /:id : Lấy chi tiết user
    .patch(
        // authMiddleware.protect, // Sẽ thêm sau
        // authMiddleware.restrictTo('admin'), // Ví dụ: Chỉ admin được sửa
        userController.updateUser
    )   // PATCH /:id : Cập nhật user
    .delete(
        // authMiddleware.protect, // Sẽ thêm sau
        // authMiddleware.restrictTo('admin'), // Ví dụ: Chỉ admin được xóa
        userController.deleteUser
    ); // DELETE /:id : Xóa user (soft delete)

// --- Các routes tiềm năng khác ---
// router.patch('/:id/updateMyPassword', authMiddleware.protect, userController.updateMyPassword);
// router.get('/me', authMiddleware.protect, userController.getMe);


// Export router để sử dụng trong routes/index.js
module.exports = router;