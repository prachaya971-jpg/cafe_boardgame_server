const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
   reqtable: async (tableId) => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();

        const sql1 = `
            INSERT INTO table_request (table_number, table_req_status_id, date_time) 
            VALUES (?, 'N', NOW())
        `;
          await conn.query(sql1, [tableId]);

        const sql2 = `
            UPDATE table_no 
            SET table_status_id = 'C' 
            WHERE table_number = ?
        `;
          await conn.query(sql2, [tableId]);
          await conn.commit();
            result = {
                isError: false,
                data: tableId,
                errorMessage: ""
            
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