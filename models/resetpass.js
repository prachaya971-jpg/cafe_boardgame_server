const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    resetpassword: async (empId, newPassword) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            const sql = `
           UPDATE employee 
            SET password_status_id = 'Y', 
             password = ?
            WHERE emp_id = ?;
            `;

            const res = await conn.query(sql, [newPassword, empId]);
            const affectedRows = res.affectedRows ?? res[0]?.affectedRows ?? 0;

            if (affectedRows === 0) {
                result = {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            } else {
                result = {
                    isError: false,
                    data: { affectedRows: Number(affectedRows) },
                    errorMessage: ""
                };
            }
        } catch (error) {
            result = {
                isError: true,
                data: null,
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
            return result;
        }
    },
}