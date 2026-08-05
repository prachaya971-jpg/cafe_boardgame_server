const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    gettest888: async () => {
        let conn;

        try {
            conn = await pool.getConnection();

            // เปลี่ยน SQL ให้ตรงกับสิ่งที่ต้องการดึงจริงๆ (เช่น การนับจำนวน)
            const sql = `SELECT COUNT(*) AS total_borrows FROM boardgameforsale`;
            const rows = await conn.query(sql);

            // ป้องกันกรณี rows เป็น undefined หรือไม่มีข้อมูลส่งกลับมา
            const totalborrows = rows && rows[0] && rows[0].total_borrows != null
                ? Number(rows[0].total_borrows)
                : 0;

            return {
                isError: false,
                data: {
                    total_borrows: totalborrows
                },
                errorMessage: ""
            };
        } catch (error) {
            console.error("Error in gettest888:", error);

            return {
                isError: true,
                data: { total_borrows: 0 },
                errorMessage: error.message || "Database query failed"
            };
        } finally {
            // คืน Connection เข้า Pool เสมอ ไม่ว่าจะเกิด Error หรือไม่
            if (conn) conn.release();
        }
    }
}
