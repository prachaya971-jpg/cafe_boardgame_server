const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getboardgames: async (barcodeNumber) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                    SELECT 
                        *
                    FROM v_bg_barcode WHERE bgs_barcode_number = ?
                `;
            const rows = await conn.query(sql, [barcodeNumber]);
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
    saleboardgame: async (orderdata) => {
    let conn;
    let result;

    try {
        const { emp_id, total_price, items } = orderdata;

        
        conn = await pool.getConnection();
        await conn.beginTransaction();

     
        const sqlBill = `
            INSERT INTO bill_game (emp_id, date_time, total_price)
            VALUES (?, NOW(), ?)
        `;
        const resBill = await conn.query(sqlBill, [emp_id, total_price]);
        

        const newSaleBgId = Number(resBill.insertId);

        
        const itemList = Array.isArray(items) ? items : [orderdata];

        
        const sqlDetail = `
            INSERT INTO bill_game_detail (sale_bg_id, bg_id, unit_price, quantity)
            VALUES (?, ?, ?, ?)
        `;

        const detailValues = itemList.map(item => [
            newSaleBgId,
            item.bg_id,
            item.unit_price,
            item.quantity
        ]);

        await conn.batch(sqlDetail, detailValues);

        const sqlDeductStock = `
            UPDATE board_game_sale
            SET quantity = quantity - ?
            WHERE bg_id = ? AND quantity >= ?
        `;

        for (const item of itemList) {
            const updateResult = await conn.query(sqlDeductStock, [
                item.quantity,
                item.bg_id,
                item.quantity
            ]);

            
            if (updateResult.affectedRows === 0) {
                throw new Error(`สินค้าบอร์ดเกมรหัส ${item.bg_id} มีจำนวนในสต็อกไม่เพียงพอ`);
            }
        }

        
        await conn.commit();

        result = {
            isError: false,
            data: { sale_bg_id: newSaleBgId },
            message: 'บันทึกการขายและตัดสต็อกสินค้าเรียบร้อยแล้ว'
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