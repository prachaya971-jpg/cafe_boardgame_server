const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getorderList: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();


            const sql = `
            SELECT * FROM v_order_detail;
        `;

            const rows = await conn.query(sql);
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
            if (conn)
                conn.release();

            return result;
        }
    },


    updateorderserver: async (orderDetailId) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            const sql = `
            UPDATE order_food SET serve_status_id = 'Y' WHERE order_detail_id = ?
        `;

            const res = await conn.query(sql, [orderDetailId]);

            if (res.affectedRows === 0) {
                result = {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            } else {
                result = {
                    isError: false,
                    data: { affectedRows: Number(res.affectedRows) },
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
