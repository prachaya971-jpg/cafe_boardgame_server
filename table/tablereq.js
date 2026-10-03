const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    gettablereqList: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_table_req;
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

    gettablereqcount: async () => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();
        const sql = `
            SELECT COUNT(tr.table_request_id) AS total_pending_requests
            FROM \`table_no\` ot
            JOIN table_status ts 
                ON ot.table_status_id = ts.table_status_id
            JOIN table_request tr 
                ON tr.table_number = ot.table_number
            WHERE DATE(tr.date_time) = CURDATE()
              AND ot.table_status_id = 'C' 
              AND tr.table_req_status_id = 'N';
        `;

        const rows = await conn.query(sql);

        const totalCount = rows.length > 0 ? Number(rows[0].total_pending_requests) : 0;

        result = {
            isError: false,
            data: {
                total_pending_requests: totalCount
            },
            errorMessage: ""
        };
    } catch (error) {
        result = {
            isError: true,
            data: {
                total_pending_requests: 0
            },
            errorMessage: error.message
        };
    } finally {
        if (conn) conn.release();
        return result;
    }
},
updatetablereq: async (tableId, table_request_id) => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();
       
        const sql = `
            UPDATE table_no 
            SET table_status_id = 'N' 
            WHERE table_number = ?
        `;
        await conn.query(sql, [tableId]);

        const sql1 = `
            UPDATE table_request 
            SET table_req_status_id = 'Y' 
            WHERE table_number = ? AND table_request_id = ?
        `;
       
        const res = await conn.query(sql1, [tableId, table_request_id]);

        const affected = Number(res.affectedRows || 0);

        if (affected === 0) {
            await conn.rollback();
            result = {
                isError: true,
                data: null,
                errorMessage: ""
            };
        } else {
            await conn.commit();
            result = {
                isError: false,
                data: { affectedRows: affected },
                errorMessage: ""
            };
        }
    } catch (error) {
        if (conn) await conn.rollback();
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
canceltablereq: async (tableId, table_request_id) => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();
       
        const sql = `
            UPDATE table_no 
            SET table_status_id = 'Y' 
            WHERE table_number = ?
        `;
        await conn.query(sql, [tableId]);

        const sql1 = `
            UPDATE table_request 
            SET table_req_status_id = 'C' 
            WHERE table_number = ? AND table_request_id = ?
        `;
       
        const res = await conn.query(sql1, [tableId, table_request_id]);

        const affected = Number(res.affectedRows || 0);

        if (affected === 0) {
            await conn.rollback();
            result = {
                isError: true,
                data: null,
                errorMessage: ""
            };
        } else {
            await conn.commit();
            result = {
                isError: false,
                data: { affectedRows: affected },
                errorMessage: ""
            };
        }
    } catch (error) {
        if (conn) await conn.rollback();
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