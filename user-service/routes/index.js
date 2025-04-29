// routes/index.js

const express = require('express');
const userRouter = require('./user.routes'); // Import router cho user
// const roleRouter = require('./role.routes'); // Ví dụ: import router cho role sau này
// const permissionRouter = require('./permission.routes'); // Ví dụ: import router cho permission sau này
// const authRouter = require('./auth.routes'); // Ví dụ: import router cho auth sau này

// Tạo router chính cho API v1
const router = express.Router();

// Gắn các router con vào đường dẫn tương ứng
// Tất cả các route trong userRouter sẽ bắt đầu bằng '/users'
// Ví dụ: GET /api/v1/users/, POST /api/v1/users/, GET /api/v1/users/:id
router.use('/users', userRouter);

// Khi có thêm các router khác, bạn sẽ gắn chúng vào đây:
// router.use('/roles', roleRouter);
// router.use('/permissions', permissionRouter);
// router.use('/auth', authRouter); // Routes cho login, register, forgotPassword...

// Có thể thêm một route kiểm tra nhanh cho chính router v1 này (tùy chọn)
router.get('/status', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API v1 is running' });
});


// Export router chính
module.exports = router;