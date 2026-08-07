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
                SELECT 
                    t.table_number, 
                    ts.table_status_name,
                    COALESCE(SUM(of.quantity), 0) AS pending_quantity
                FROM \`table_no\` t
                JOIN \`table_status\` ts ON t.table_status_id = ts.table_status_id
                LEFT JOIN \`order\` o ON t.table_number = o.table_number 
                    AND DATE(o.date_time) = CURDATE() 
                    AND o.order_status_id = 'N'
                LEFT JOIN \`order_food\` of ON o.order_id = of.order_id 
                    AND of.serve_status_id = 'N'
                GROUP BY t.table_number, ts.table_status_name
                ORDER BY CAST(t.table_number AS UNSIGNED) ASC
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
    
}