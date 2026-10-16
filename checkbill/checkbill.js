const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    gettablebyorder: async () => {
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
    getcheckbillbyorder: async (table_number) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
    SELECT 
        *
    FROM v_chenkbill
    WHERE table_number = ?
        `;
            const rows = await conn.query(sql, [table_number]);
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
    getcheckbillbyorderdetail: async (order_id) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
    SELECT 
        *
    FROM v_checkbill_order
    WHERE order_id = ?
        `;
            const rows = await conn.query(sql, [order_id]);
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
    checkbill: async (orderid, totalprice, orderDetaillist, io) => {
        let conn;
        let result;

        try {
            const detailIds = Array.isArray(orderDetaillist) ? orderDetaillist : [orderDetaillist];

            conn = await pool.getConnection();
            await conn.beginTransaction();

            const sql = `UPDATE \`order\` SET total_price = total_price + ? WHERE order_id = ?`;
            await conn.query(sql, [totalprice, orderid]);


            const sqlUpdateDetails = `
            UPDATE order_food
            SET pay_status_id = 'Y'
            WHERE order_detail_id IN (?)
        `;
            const updateResult = await conn.query(sqlUpdateDetails, [detailIds]);


            const rawOrder = await conn.query(
                "SELECT table_number FROM `order` WHERE order_id = ?",
                [orderid]
            );

           
            const orderData = Array.isArray(rawOrder)
                ? (Array.isArray(rawOrder[0]) ? rawOrder[0][0] : rawOrder[0])
                : rawOrder;

            const tableNumber = orderData?.table_number ?? null;


           
            const rawUnpaid = await conn.query(
                `SELECT COUNT(*) AS unpaid_count 
     FROM order_food 
     WHERE order_id = ? 
       AND pay_status_id != 'Y' 
       AND serve_status_id NOT IN ('C', 'R')`,
                [orderid]
            );

            const unpaidData = Array.isArray(rawUnpaid)
                ? (Array.isArray(rawUnpaid[0]) ? rawUnpaid[0][0] : rawUnpaid[0])
                : rawUnpaid;

            const unpaidCount = Number(unpaidData?.unpaid_count ?? 0);

            let isTableClosed = (unpaidCount === 0);

    
            await conn.commit();

         
            if (isTableClosed && io && tableNumber) {
                const roomName = `table_${String(tableNumber).trim()}`;

                io.to(roomName).emit('clear_customer_token', {
                    table_number: tableNumber,
                    message: 'โต๊ะนี้ปิดบิลเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ'
                });

                console.log(` ส่งสัญญาณ clear_customer_token ไปที่ห้อง: ${roomName}`);
            }

            result = {
                isError: false,
                data: {
                    affectedRows: updateResult.affectedRows,
                    isTableClosed: isTableClosed
                },
                message: isTableClosed
                    ? 'ชำระเงินครบทุกรายการและปิดโต๊ะเรียบร้อย'
                    : 'เช็กบิลรายการที่เลือกสำเร็จ'
            };

        } catch (error) {
            if (conn) await conn.rollback();

            result = {
                isError: true,
                data: [],
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
            return result;
        }
    }
}
