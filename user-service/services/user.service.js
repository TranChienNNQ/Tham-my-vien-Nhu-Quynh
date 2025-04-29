const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model'); // Import user model
const logger = require('../utils/logger');
const AppError = require('../utils/appError'); // Import AppError để tạo lỗi nghiệp vụ
/**
 * Tạo user mới với mật khẩu đã được hash.
 * @param {object} userData - Dữ liệu user từ controller.
 * @returns {Promise<object>} Object user đã tạo (không có password hash).
 * @throws {AppError} Nếu username hoặc email đã tồn tại.
 */
const createUser = async (userData) => {
    const { username, email, password, employeeId, isActive } = userData;

    // 1. Kiểm tra xem username hoặc email đã tồn tại chưa (tùy chọn, DB constraint cũng sẽ bắt)
    // Có thể bỏ qua bước này nếu bạn tin tưởng vào unique constraint của DB
    const existingUserByUsername = await userModel.findByUsername(username);
    if (existingUserByUsername) {
        throw new AppError(`Username '${username}' already exists.`, 409); // 409 Conflict
    }
    if (email) { // Chỉ tkiểm tra email nếu nó được cung cấp
        const existingUserByEmail = await userModel.findByEmail(email);
        if (existingUserByEmail) {
            throw new AppError(`Email '${email}' already exists.`, 409);
        }
    }

    // 2. Hash mật khẩu trước khi lưu
    // Lấy số vòng salt từ biến môi trường hoặc dùng giá trị mặc định an toàn
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);
    logger.debug(`Password hashed for user: ${username}`);
    // 3. Gọi model để tạo user với password đã hash
    try {
        const newUser = await userModel.create({
            employeeId,
            username,
            passwordHash, // Lưu hash vào DB
            email,
            isActive,
        });
        // Quan trọng: Không bao giờ trả về password hash cho client
        delete newUser.PasswordHash; // Xóa trường hash khỏi object trả về (dù model cũng đã bỏ)
        return newUser;
    } catch (dbError) {
        // Xử lý lỗi từ DB (ví dụ: lỗi unique constraint nếu không kiểm tra ở bước 1)
        if (dbError.code === '23505') { // Mã lỗi unique violation của PostgreSQL
            logger.warn(`Database constraint violation during user creation: ${dbError.detail}`);
            // Cố gắng xác định trường bị trùng lặp từ detail message
            if (dbError.detail?.includes('(Username)')) {
                throw new AppError(`Username '${username}' already exists.`, 409);
            } else if (dbError.detail?.includes('(Email)')) {
                throw new AppError(`Email '${email}' already exists.`, 409);
            } else {
                throw new AppError('User creation failed due to duplicate information.', 409);
            }
        }
        // Ném lại các lỗi DB khác
        logger.error('Database error during user creation in service:', dbError);
        throw new AppError('Failed to create user due to database error.', 500);
    }

};

/**
 * Lấy thông tin user theo ID.
 * @param {number} userId - ID của user.
 * @returns {Promise<object>} Object user.
 * @throws {AppError} Nếu không tìm thấy user.
 */
const getUserById = async (userId) => {
    const user = await userModel.findById(userId);
    if (!user) {
        throw new AppError(`User with ID ${userId} not found.`, 404); // 404 Not Found
    }
    // Đảm bảo không trả về hash (dù model findById đã loại bỏ)
    delete user.PasswordHash;
    return user;
};
/**
* Lấy thông tin user theo Username (thường dùng nội bộ, vd: cho auth).
* Hàm này có thể trả về password hash nếu cần.
* @param {string} username - Tên đăng nhập.
* @returns {Promise<object>} Object user đầy đủ.
* @throws {AppError} Nếu không tìm thấy user.
*/
const getUserByUsername = async (username) => {
    const user = await userModel.findByUsername(username);
    if (!user) {
        throw new AppError(`User with username '${username}' not found.`, 404);
    }
    // Không xóa password hash ở đây vì có thể cần cho việc xác thực
    return user;
};
/**
 * Lấy danh sách tất cả user (có phân trang).
 * @param {object} options - Tùy chọn phân trang { limit, offset }.
 * @returns {Promise<object>} Object chứa danh sách users và thông tin phân trang.
 */
const getAllUsers = async (options) => {
    // Service có thể thêm logic filter, sort phức tạp hơn ở đây nếu cần
    const result = await userModel.findAll(options);
    // Đảm bảo không có password hash trong danh sách trả về
    result.users.forEach(user => delete user.PasswordHash);
    return result;
};

/**
* Cập nhật thông tin user.
* @param {number} userId - ID của user cần cập nhật.
* @param {object} updateData - Dữ liệu cần cập nhật.
* @returns {Promise<object>} Object user sau khi cập nhật.
* @throws {AppError} Nếu không tìm thấy user hoặc có lỗi (vd: email trùng).
*/
const updateUser = async (userId, updateData) => {
    // Không cho phép cập nhật username hoặc password qua hàm này
    // Nên có hàm riêng cho đổi password
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.username;
    delete allowedUpdates.password;
    delete allowedUpdates.passwordHash; // Chắc chắn không cho cập nhật hash trực tiếp

    if (Object.keys(allowedUpdates).length === 0) {
        logger.debug(`No valid fields to update for user ID ${userId}`);
        return getUserById(userId); // Trả về user hiện tại nếu không có gì cập nhật
    }

    // Kiểm tra email trùng nếu email được cập nhật
    if (allowedUpdates.email) {
        const existingUser = await userModel.findByEmail(allowedUpdates.email);
        // Chỉ báo lỗi nếu email tồn tại và thuộc về user khác
        if (existingUser && existingUser.UserID !== userId) {
            throw new AppError(`Email '${allowedUpdates.email}' is already associated with another user.`, 409);
        }
    }

    try {
        const updatedUser = await userModel.update(userId, allowedUpdates);
        if (!updatedUser) {
            throw new AppError(`User with ID ${userId} not found for update.`, 404);
        }
        delete updatedUser.PasswordHash; // Đảm bảo hash không bị lộ
        return updatedUser;
    } catch (dbError) {
        // Xử lý lỗi từ DB (ví dụ: lỗi unique constraint nếu kiểm tra ở trên bị lọt)
        if (dbError.code === '23505' && dbError.detail?.includes('(Email)')) {
            throw new AppError(`Email '${allowedUpdates.email}' already exists.`, 409);
        }
        logger.error(`Database error during user update in service (ID: ${userId}):`, dbError);
        throw new AppError('Failed to update user due to database error.', 500);
    }
};
/**
 * Xóa user (soft delete).
 * @param {number} userId - ID của user cần xóa.
 * @returns {Promise<object>} Object user đã bị đánh dấu inactive.
 * @throws {AppError} Nếu không tìm thấy user.
 */
const deleteUser = async (userId) => {
    const deletedUser = await userModel.remove(userId); // Gọi hàm remove (soft delete) của model
    if (!deletedUser) {
        throw new AppError(`User with ID ${userId} not found for deletion.`, 404);
    }
    delete deletedUser.PasswordHash;
    return deletedUser;
};


module.exports = {
    createUser,
    getUserById,
    getUserByUsername, // Export hàm này nếu cần cho auth service
    getAllUsers,
    updateUser,
    deleteUser,
};

