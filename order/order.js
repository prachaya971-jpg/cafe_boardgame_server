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


    updateorderserver: async (orderDetailId, orderstatus) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            let Status = '';
            if (orderstatus === 'N') {
                Status = 'A';
            } else if (orderstatus === 'A') {
                Status = 'Y';
            } else {
                Status = 'N'; 
            }

            const sql = `
            UPDATE order_food 
            SET serve_status_id = ? 
            WHERE order_detail_id = ?
        `;

            const res = await conn.query(sql, [Status, orderDetailId]);
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
                    data: {
                        affectedRows: Number(affectedRows),
                        currentStatus: Status
                    },
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
        }

        return result;
    },
}
