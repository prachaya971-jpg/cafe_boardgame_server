const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getadviceList: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_advice_list;
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
    updateadvice: async (adviceId) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
        const sql = `
            UPDATE advice_list SET status_advice_id = 'Y' WHERE advice_id = ?
        `;

        const res = await conn.query(sql, [adviceId]);

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
    }
    
}