const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    gettable: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT 
                    t.table_number,
                    t.table_status_id,
                    ts.table_status_name
                FROM table_no t
                JOIN table_status ts ON ts.table_status_id = t.table_status_id
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
            if (conn) conn.release();
            return result;
        }
    },

   createtable: async () => {
    let conn;
    try {
        conn = await pool.getConnection();

        const findNextSql = `
            SELECT COALESCE(MAX(CAST(table_number AS UNSIGNED)), 0) + 1 AS next_table_number 
            FROM table_no;
        `;
        const nextRows = await conn.query(findNextSql);
        const nextTableNumber = Number(nextRows[0]?.next_table_number ?? 1);

        const insertSql = `
            INSERT INTO table_no (table_number, table_status_id) 
            VALUES (?, 'Y');
        `;
        const res = await conn.query(insertSql, [nextTableNumber]);
        const insertId = res.insertId ?? res[0]?.insertId;

        return {
            isError: false,
            data: { 
                table_number: nextTableNumber,
                insertId: insertId ? Number(insertId) : null 
            },
            errorMessage: ""
        };
    } catch (error) {
        return {
            isError: true,
            data: null,
            errorMessage: error.message
        };
    } finally {
        if (conn) conn.release();
    }
},
  deletetable: async () => {
    let conn;
    try {
        conn = await pool.getConnection();

        const findMaxSql = `
            SELECT MAX(CAST(table_number AS UNSIGNED)) AS max_table_number 
            FROM table_no;
        `;
        const maxRows = await conn.query(findMaxSql);
        const maxTableNumber = maxRows[0]?.max_table_number;

        if (maxTableNumber === null || maxTableNumber === undefined) {
            return {
                isError: true,
                data: null,
                errorMessage: "ไม่มีข้อมูลโต๊ะในระบบให้ลบ"
            };
        }

        const deleteSql = `
            DELETE FROM table_no 
            WHERE CAST(table_number AS UNSIGNED) = ?;
        `;
        const res = await conn.query(deleteSql, [Number(maxTableNumber)]);
        const affectedRows = res.affectedRows ?? res[0]?.affectedRows ?? 0;

        return {
            isError: false,
            data: { 
                deleted_table_number: Number(maxTableNumber),
                affectedRows: Number(affectedRows)
            },
            errorMessage: ""
        };
    } catch (error) {
        return {
            isError: true,
            data: null,
            errorMessage: error.message
        };
    } finally {
        if (conn) conn.release();
    }
}

}