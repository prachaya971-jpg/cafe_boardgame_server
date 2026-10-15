const { isErrored } = require('node:stream');
const pool = require('../../libs/db_pool');
const dateUtils = require('../../libs/date_utils');
const { error } = require('node:console');

module.exports = {
reqabvicecus: async (table_no) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

           
            const sql = `
            iNSERT INTO advice_list (tablenumber, status_advice_id, date_time) VALUES (?, 'N', NOW());
        `;

            const res = await conn.query(sql, [table_no]);


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
                        tableNo: table_no
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
     getadviceListcus: async (table_no) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_cus_advice WHERE tablenumber = ?;
            `;
            const rows = await conn.query(sql, [table_no]);
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

}