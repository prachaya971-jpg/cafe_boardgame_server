const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getUserAccountById: async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            var sql = "SELECT * FROM employee WHERE user_id = ?";

            var rows = await conn.query(sql, [accountId]);

            result = {
                isError: true,
                data: rows
            };
        } catch (error) {
            result = {
                isError: false,
                errorMassage: error.message
            }
        } finally {
            if (conn)
                conn.release();
            return result;
        }

    },

    CheckAuthenRequest: async (authenRequest) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT user_id FROM employee WHERE "
        + "SHA2(CONCAT(user_id, '&', ?), 256) = ?";

            var rows = await conn.query(sql, [dateUtils.getCurrentDateForToken(), authenRequest]);

            if (rows.length == 0) {
                result = {
                    isError: true,
                    errorMassage: "ไม่พบข้อมูลผู้ใช้ในระบบ"
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

    checkAccesRequest: async (authenSignature, authenToken) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT * FROM employee WHERE "
                + "LOWER(SHA2(CONCAT(TRIM(user_id), '&', TRIM(password), '&', ?), 256)) = ?";

            var rows = await conn.query(sql, [authenToken, authenSignature]);

            if (rows.length == 0) {
                result = {
                    isError: true,
                    errorMessage: "รหัสผ่านไม่ถูกต้อง"
                }
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
            }
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },
}
