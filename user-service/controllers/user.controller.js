// controllers/user.controller.js

const userService = require('../services/user.service'); // Import service
const catchAsync = require('../utils/catchAsync'); // Import tiện ích bắt lỗi async
const AppError = require('../utils/appError'); // Import lớp lỗi tùy chỉnh (có thể cần nếu controller tự tạo lỗi)
const logger = require('../utils/logger'); // Import logger

/**
 * @desc    Tạo người dùng mới
 * @route   POST /api/v1/users
 * @access  Private (Cần quyền - sẽ thêm sau)
 */
const createUser = catchAsync(async (req, res, next) => {
    // Lấy dữ liệu từ request body
    const { username, password, email, employeeId, isActive } = req.body;

    // Validate dữ liệu đầu vào cơ bản (Nên dùng thư viện validation như Joi/express-validator sau này)
    if (!username || !password) {
        // Nếu dùng AppError, globalErrorHandler sẽ xử lý
        return next(new AppError('Username and password are required.', 400));
        // Hoặc trả về lỗi trực tiếp nếu chưa có globalErrorHandler chuẩn
        // return res.status(400).json({ status: 'fail', message: 'Username and password are required.' });
    }

    // Gọi service để tạo user
    const newUser = await userService.createUser({
        username,
        password,
        email,
        employeeId,
        isActive,
    });

    // Không gửi lại password hash trong response
    delete newUser.PasswordHash;

    // Gửi response thành công
    res.status(201).json({ // 201 Created
        status: 'success',
        message: 'User created successfully.',
        data: {
            user: newUser,
        },
    });
});

/**
 * @desc    Lấy danh sách người dùng (có phân trang)
 * @route   GET /api/v1/users
 * @access  Private (Cần quyền - sẽ thêm sau)
 */
const getAllUsers = catchAsync(async (req, res, next) => {
    // Lấy tham số phân trang từ query string (vd: /users?page=1&limit=5)
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    // TODO: Thêm logic lấy filter, sort từ req.query nếu cần

    // Gọi service để lấy danh sách user
    const result = await userService.getAllUsers({ limit, offset }); // Truyền limit và offset

    // Gửi response
    res.status(200).json({
        status: 'success',
        message: 'Users fetched successfully.',
        results: result.users.length, // Số lượng user trên trang này
        pagination: {
            currentPage: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            totalUsers: result.total
        },
        data: {
            users: result.users,
        },
    });
});

/**
 * @desc    Lấy thông tin chi tiết một người dùng
 * @route   GET /api/v1/users/:id
 * @access  Private (Cần quyền - sẽ thêm sau)
 */
const getUserById = catchAsync(async (req, res, next) => {
    const userId = parseInt(req.params.id, 10); // Lấy ID từ URL parameter

    // Kiểm tra ID hợp lệ
    if (isNaN(userId) || userId <= 0) {
        return next(new AppError('Invalid user ID format.', 400));
    }

    // Gọi service để lấy user
    // Service sẽ ném lỗi AppError 404 nếu không tìm thấy
    const user = await userService.getUserById(userId);

    // Gửi response
    res.status(200).json({
        status: 'success',
        message: 'User fetched successfully.',
        data: {
            user, // Service đã đảm bảo không có password hash
        },
    });
});

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PATCH /api/v1/users/:id (Hoặc PUT)
 * @access  Private (Cần quyền - sẽ thêm sau)
 */
const updateUser = catchAsync(async (req, res, next) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId) || userId <= 0) {
        return next(new AppError('Invalid user ID format.', 400));
    }

    // Lấy dữ liệu cần cập nhật từ body
    // Chỉ lấy các trường được phép cập nhật (vd: email, isActive, employeeId)
    // Service layer sẽ lọc lại một lần nữa
    const { email, isActive, employeeId } = req.body;
    const updateData = { email, isActive, employeeId };

    // Loại bỏ các trường undefined để service biết không cần cập nhật
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
        return next(new AppError('No valid fields provided for update.', 400));
    }

    // Gọi service để cập nhật
    // Service sẽ ném lỗi 404 nếu không tìm thấy, hoặc 409 nếu email trùng
    const updatedUser = await userService.updateUser(userId, updateData);

    // Gửi response
    res.status(200).json({
        status: 'success',
        message: 'User updated successfully.',
        data: {
            user: updatedUser, // Service đã đảm bảo không có password hash
        },
    });
});

/**
 * @desc    Xóa người dùng (Soft delete)
 * @route   DELETE /api/v1/users/:id
 * @access  Private (Cần quyền - sẽ thêm sau)
 */
const deleteUser = catchAsync(async (req, res, next) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId) || userId <= 0) {
        return next(new AppError('Invalid user ID format.', 400));
    }

    // Gọi service để xóa (soft delete)
    // Service sẽ ném lỗi 404 nếu không tìm thấy
    await userService.deleteUser(userId);

    // Gửi response thành công (204 No Content thường dùng cho DELETE thành công)
    res.status(204).json({
        status: 'success',
        message: 'User deleted successfully.',
        data: null, // Không có nội dung trả về
    });
});

// Export các hàm controller
module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
};