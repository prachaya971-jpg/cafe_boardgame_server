const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console')

module.exports = {
    checktableRequest: async (tableRequest) => {
    let conn;
    let result;

    try {
        conn = await pool.getConnection();

        const sql = `
            SELECT table_number, table_status_id
            FROM \`table_no\` 
            WHERE CONCAT(
                SHA2(CAST(table_number AS CHAR), 256), 
                '&', 
                SHA2(?, 256)
            ) = ?
        `;

        const rows = await conn.query(sql, [
            dateUtils.getCurrentDateForToken(), 
            tableRequest
        ]);

        if (rows.length === 0) {
            result = {
                isError: true,
                errorMessage: "ไม่พบข้อมูลโต๊ะ"
            };
        } else {
            result = {
                isError: false,
                data: rows
            };
        }
    } catch (error) {
        result = {
            isError: true,
            errorMessage: error.message
        };
    } finally {
        if (conn) conn.release();
        return result;
    }
},

   checkAccesRequest: async (tableNumber) => {
    let conn;
    let result;

    try {
        conn = await pool.getConnection();

        var sql = `
            SELECT table_number, table_status_id 
            FROM \`table_no\` 
            WHERE table_number = ?
        `;

        var rows = await conn.query(sql, [tableNumber]);

        if (rows.length == 0) {
            result = {
                isError: true,
                errorMessage: "เลขโต๊ะไม่ถูกต้อง"
            };
        } else {
            result = {
                isError: false,
                data: rows
            };
        }
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