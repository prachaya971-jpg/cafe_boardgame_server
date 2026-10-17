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
    }, updatetablestatus: async (table_no, io = null) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction(); // เริ่ม Transaction

       
        const checkOrderSql = `
            SELECT 
                COUNT(DISTINCT o.order_id) AS pending_orders,
                COUNT(of.order_detail_id) AS pending_items
            FROM \`order\` o
            INNER JOIN order_food of ON of.order_id = o.order_id
            WHERE o.table_number = ? 
              AND DATE(o.date_time) = CURDATE()
              AND (o.order_status_id = 'N' OR of.pay_status_id = 'N');
        `;

        const checkRows = await conn.query(checkOrderSql, [table_no]);
        const pendingOrders = Number(checkRows[0]?.pending_orders ?? 0);
        const pendingItems = Number(checkRows[0]?.pending_items ?? 0);

        if (pendingOrders > 0 || pendingItems > 0) {
            await conn.rollback();
            return {
                isError: true,
                data: null,
                errorMessage: `ไม่สามารถเปิด/ปิดโต๊ะ ${table_no} ได้ เนื่องจากยังมีออเดอร์ค้างชำระ (${pendingOrders} บิล, ${pendingItems} รายการ)`
            };
        }

        const deleteEmptyOrderSql = `
            DELETE FROM \`order\`
            WHERE order_id = (
                SELECT target.order_id FROM (
                    SELECT o.order_id
                    FROM \`order\` o
                    LEFT JOIN order_food of ON of.order_id = o.order_id
                    WHERE o.table_number = ?
                      AND o.order_status_id = 'N'
                      AND of.order_id IS NULL
                    ORDER BY o.order_id DESC
                    LIMIT 1
                ) AS target
            );
        `;
        await conn.query(deleteEmptyOrderSql, [table_no]);

        
        const updateSql = `
            UPDATE table_no
            SET table_status_id = 'Y'
            WHERE table_number = ?;
        `;
        const res = await conn.query(updateSql, [table_no]);
        const affectedRows = Number(res.affectedRows ?? res[0]?.affectedRows ?? 0);

        if (affectedRows === 0) {
            await conn.rollback();
            return {
                isError: true,
                data: null,
                errorMessage: `ไม่พบโต๊ะหมายเลข ${table_no} หรือสถานะเป็นว่างอยู่แล้ว`
            };
        }

       
        await conn.commit();

        
        if (affectedRows > 0 && io) {
            const roomName = `table_${String(table_no).trim()}`;
            io.to(roomName).emit('clear_customer_token', {
                table_number: table_no,
                message: 'โต๊ะนี้ปิดบิลเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ'
            });
            console.log(`ส่งสัญญาณ clear_customer_token ไปที่ห้อง: ${roomName}`);
        }

        return {
            isError: false,
            data: {
                table_number: table_no,
                affectedRows
            },
            message: `อัปเดตสถานะโต๊ะ ${table_no} เป็นว่างเรียบร้อยแล้ว`
        };

    } catch (error) {
        if (conn) await conn.rollback();
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