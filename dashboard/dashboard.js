const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
   getRevenueSummary: async (period, category) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            // 1. กำหนดเงื่อนไขช่วงเวลาสำหรับแต่ละตาราง
            let orderDateCond = "DATE(date_time) = CURDATE()";
            let billDateCond = "DATE(date_time) = CURDATE()";

            if (period === 'monthly') {
                orderDateCond = "YEAR(date_time) = YEAR(CURDATE()) AND MONTH(date_time) = MONTH(CURDATE())";
                billDateCond = "YEAR(date_time) = YEAR(CURDATE()) AND MONTH(date_time) = MONTH(CURDATE())";
            } else if (period === 'yearly') {
                orderDateCond = "YEAR(date_time) = YEAR(CURDATE())";
                billDateCond = "YEAR(date_time) = YEAR(CURDATE())";
            }

            let sql = "";

            // 2. แยก Query ตามประเภทสินค้า (Category)
            if (category === 'food') {
                // ดึงเฉพาะรายได้ค่าอาหารที่จ่ายเงินแล้ว (order_status_id = 'Y')
                sql = `
                    SELECT COALESCE(SUM(total_price), 0) AS total_revenue 
                    FROM \`order\` 
                    WHERE order_status_id = 'Y' AND ${orderDateCond}
                `;
            } else if (category === 'boardgame') {
                // ดึงเฉพาะรายได้จากการขายบอร์ดเกม
                sql = `
                    SELECT COALESCE(SUM(total_price), 0) AS total_revenue 
                    FROM bill_game 
                    WHERE ${billDateCond}
                `;
            } else {
                // เลือก 'all' (รวมทั้งค่าอาหารและขายบอร์ดเกม)
                sql = `
                    SELECT COALESCE(SUM(total_revenue), 0) AS total_revenue FROM (
                        SELECT SUM(total_price) AS total_revenue FROM \`order\` WHERE order_status_id = 'Y' AND ${orderDateCond}
                        UNION ALL
                        SELECT SUM(total_price) AS total_revenue FROM bill_game WHERE ${billDateCond}
                    ) AS combined_revenue
                `;
            }

            const rows = await conn.query(sql);

            result = {
                isError: false,
                data: {
                    total_revenue: rows[0].total_revenue || 0
                },
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: true,
                data: { total_revenue: 0 },
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
            return result;
        }
    },
}