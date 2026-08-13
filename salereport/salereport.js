const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    // --- ในไฟล์ Controller / Model ---
getsalereport: async (searchDate) => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();

        let sql = `SELECT * FROM v_sale_report`; 
        let params = [];

        if (searchDate) {
            sql += ` WHERE DATE(date_time) = ?`;
            params.push(searchDate);
        }

        const rows = await conn.query(sql, params);
        result = {
            isError: false,
            data: rows,
            errorMessage: ""
        };
    } catch (error) {
        result = {
            isError: true,
            data: [],
            errorMessage: error.message
        };
    } finally {
        if (conn) conn.release();
        return result;
    }
}
}