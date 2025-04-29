'use strict';
const db = require("../config/db.config");
const logger = require("../utils/logger");
// Hàm tạo user mới
// Lưu ý: passwordHash đã được hash ở tầng service trước khi truyền vào đây
const create = async ({ employeeId, username, passwordHash, email, isActive = true }) => {
    const queryText = `
    INSERT INTO "USERS" ("EmployeeID", "Username", "PasswordHash", "Email", "IsActive")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING "UserID", "EmployeeID", "Username", "Email", "IsActive", "CreatedAt", "UpdatedAt";
    `;
    // Sử dụng Array để đảm bảo thứ tự tham số đúng
    const values = [employeeId, username, passwordHash, email, isActive];
    try {
        const result = await db.query[queryText, values];
        logger.debug(`User created successfully with ID: ${result.rows[0].UserID}`);
        return result.rows[0]; // Trả về thông tin user vừa tạo (không bao gồm password)
    } catch (error) {
        logger.error("❌ Error creating user:", { error: err, query: queryText, values });
        throw error;
    }
}
// Hàm tìm user theo UserID
const findById = async (userId) => {
    const queryText = `
    SELECT "UserID", "EmployeeID", "Username", "Email", "IsActive", "LastLoginAt", "CreatedAt", "UpdatedAt"
    FROM "Users"
    WHERE "UserID" = $1;
  `;
    try {
        const result = await db.query(queryText, [userId]);
        if (result.rows.length > 0) {
            logger.debug(`User found by ID: ${userId}`);
            return result.rows[0];
        }
        logger.debug(`User not found by ID: ${userId}`);
        return null; // Không tìm thấy user
    } catch (error) {
        logger.error("❌ Error finding user by ID:", { error: err, userId });
        throw error;
    }
}

// Hàm tìm user theo Username (cần cho login)
const findByUsername = async (username) => {
    const queryText = `
      SELECT * -- Lấy tất cả các cột, bao gồm cả PasswordHash để kiểm tra login
      FROM "Users"
      WHERE "Username" = $1;
    `;
    try {
        const result = await db.query(queryText, [username]);
        if (result.rows.length > 0) {
            logger.debug(`User found by username: ${username}`);
            return result.rows[0]; // Trả về đầy đủ thông tin user (bao gồm hash)
        }
        logger.debug(`User not found by username: ${username}`);
        return null;
    } catch (err) {
        logger.error('Error finding user by username in model:', { error: err, username });
        throw err;
    }
};

// Hàm tìm user theo Email
const findByEmail = async (email) => {
    if (!email) return null; // Tránh query nếu email null/undefined
    const queryText = `
    SELECT "UserID", "EmployeeID", "Username", "Email", "IsActive", "LastLoginAt", "CreatedAt", "UpdatedAt"
    FROM "Users"
    WHERE "Email" = $1;
  `;
    try {
        const result = await db.query(queryText, [email]);
        if (result.rows.length > 0) {
            logger.debug(`User found by email: ${email}`);
            return result.rows[0];
        }
        logger.debug(`User not found by email: ${email}`);
        return null;
    } catch (err) {
        logger.error('Error finding user by email in model:', { error: err, email });
        throw err;
    }
};

// Hàm lấy danh sách user (phiên bản cơ bản)
// TODO: Thêm phân trang (LIMIT, OFFSET), lọc (WHERE), sắp xếp (ORDER BY)
const findAll = async ({ limit = 10, offset = 0 } = {}) => {
    const queryText = `
      SELECT "UserID", "EmployeeID", "Username", "Email", "IsActive", "LastLoginAt", "CreatedAt", "UpdatedAt"
      FROM "Users"
      ORDER BY "CreatedAt" DESC
      LIMIT $1 OFFSET $2;
    `;

    try {
        // Đếm tổng số lượng bản ghi để tính toán phân trang
        const countResult = await db.query('SELECT COUNT(*) FROM "Users";');

        // Log kết quả trả về từ countResult để xem có vấn đề gì
        logger.debug('Count result:', countResult);

        // Kiểm tra xem countResult có hợp lệ không
        if (!countResult || !countResult.rows || countResult.rows.length === 0) {
            throw new Error("Failed to count users in the database.");
        }

        const totalUsers = parseInt(countResult.rows[0].count, 10);

        // Lấy dữ liệu theo phân trang
        const usersResult = await db.query(queryText, [limit, offset]);

        // Log kết quả trả về từ usersResult để kiểm tra
        logger.debug('Users result:', usersResult);

        // Kiểm tra xem usersResult có hợp lệ không
        if (!usersResult || !usersResult.rows) {
            throw new Error("Failed to retrieve users data.");
        }

        logger.debug(`Found ${usersResult.rowCount} users (limit: ${limit}, offset: ${offset}). Total users: ${totalUsers}`);

        return {
            users: usersResult.rows,
            total: totalUsers,
            page: Math.floor(offset / limit) + 1,
            limit: limit,
            totalPages: Math.ceil(totalUsers / limit)
        };
    } catch (err) {
        // Ghi log chi tiết về lỗi
        logger.error('Error finding all users in model:', { error: err });

        // Ném lại lỗi để có thể được xử lý tại các tầng gọi
        throw err;
    }
};


// Hàm cập nhật thông tin user (ví dụ: email, isActive, employeeId)
// Không cập nhật password ở đây, nên có hàm riêng cho đổi password
const update = async (userId, { employeeId, email, isActive, lastLoginAt }) => {
    // Xây dựng câu query động dựa trên các trường được cung cấp
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Chỉ thêm các trường vào câu UPDATE nếu chúng được cung cấp (không phải undefined)
    if (employeeId !== undefined) {
        fields.push(`"EmployeeID" = $${paramIndex++}`);
        values.push(employeeId);
    }
    if (email !== undefined) {
        fields.push(`"Email" = $${paramIndex++}`);
        values.push(email);
    }
    if (isActive !== undefined) {
        fields.push(`"IsActive" = $${paramIndex++}`);
        values.push(isActive);
    }
    if (lastLoginAt !== undefined) {
        fields.push(`"LastLoginAt" = $${paramIndex++}`);
        values.push(lastLoginAt);
    }

    // Nếu không có trường nào cần cập nhật, trả về null hoặc user hiện tại?
    if (fields.length === 0) {
        logger.debug('No fields provided for user update.');
        return findById(userId); // Trả về user hiện tại
    }

    // Thêm trường UpdatedAt tự động
    fields.push(`"UpdatedAt" = CURRENT_TIMESTAMP`);

    const queryText = `
        UPDATE "Users"
        SET ${fields.join(', ')}
        WHERE "UserID" = $${paramIndex}
        RETURNING "UserID", "EmployeeID", "Username", "Email", "IsActive", "LastLoginAt", "CreatedAt", "UpdatedAt";
    `;
    values.push(userId); // Thêm userId làm tham số cuối cùng

    try {
        const result = await db.query(queryText, values);
        if (result.rowCount > 0) {
            logger.debug(`User updated successfully with ID: ${userId}`);
            return result.rows[0];
        }
        logger.warn(`User not found for update with ID: ${userId}`);
        return null; // Không tìm thấy user để cập nhật
    } catch (err) {
        logger.error('Error updating user in model:', { error: err, userId, fields, values });
        throw err; // Ném lỗi lên tầng service (ví dụ: email trùng)
    }
};
// Hàm xóa user (có thể là soft delete bằng cách cập nhật IsActive = false)
const remove = async (userId) => {
    // Ví dụ về soft delete
    return update(userId, { isActive: false });

    /* // Hoặc nếu muốn xóa thật (Hard Delete - Cẩn thận!)
    const queryText = 'DELETE FROM "Users" WHERE "UserID" = $1 RETURNING "UserID";';
     try {
        const result = await db.query(queryText, [userId]);
         if (result.rowCount > 0) {
             logger.debug(`User deleted successfully with ID: ${userId}`);
            return { userId: result.rows[0].UserID, deleted: true };
        }
         logger.warn(`User not found for deletion with ID: ${userId}`);
        return { userId, deleted: false };
    } catch (err) {
         logger.error('Error deleting user in model:', { error: err, userId });
        throw err; // Có thể lỗi do ràng buộc khóa ngoại
    }
    */
};

module.exports = {
    create,
    findById,
    findByUsername,
    findByEmail,
    findAll,
    update,
    remove, // Hoặc deleteById nếu dùng hard delete
};