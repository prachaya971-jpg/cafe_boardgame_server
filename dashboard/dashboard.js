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

    getOrderCountSummary: async () => {
    let conn;
    let result;

    try {
        conn = await pool.getConnection();

        const sql = `SELECT COUNT(of.order_detail_id) AS total_orders
                     FROM \`order_food\` of
                     JOIN \`order\` o ON of.order_id = o.order_id
                     WHERE of.serve_status_id = 'Y' AND DATE(o.date_time) = CURDATE()`;

        const rows = await conn.query(sql);

        // แปลงค่าให้ชัวร์ว่าเป็น Number เผื่อ driver ส่ง BigInt มา
        const totalOrders = rows[0] && rows[0].total_orders != null
            ? Number(rows[0].total_orders)
            : 0;

        result = {
            isError: false,
            data: {
                total_orders: totalOrders
            },
            errorMessage: ""
        };
    } catch (error) {
        result = {
            isError: true,
            data: { total_orders: 0 },
            errorMessage: error.message
        };
    } finally {
        if (conn) conn.release();
        return result;
    }
},

    getadviceCountSummary: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            const sql = `SELECT COUNT(advice_id) AS total_advice
                     FROM \`advice_list\`
                     WHERE status_advice_id = 'Y' AND DATE(date_time) = CURDATE()`;

            const rows = await conn.query(sql);

            const totaladvice = rows[0] && rows[0].total_advice != null
                ? Number(rows[0].total_advice)
                : 0;

            result = {
                isError: false,
                data: {
                    total_advice: totaladvice
                },
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: true,
                data: { total_advice: 0 },
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
            return result;
        }
    },


    getborrowCountSummary: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            const sql = `SELECT COUNT(borrow_id) AS total_borrows
                     FROM \`borrow\`
                     WHERE borrow_status_id = 'Y' AND DATE(date_time) = CURDATE()`;

            const rows = await conn.query(sql);

            const totalborrows = rows[0] && rows[0].total_borrows != null
                ? Number(rows[0].total_borrows)
                : 0;

            result = {
                isError: false,
                data: {
                    total_borrows: totalborrows
                },
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: true,
                data: { total_borrows: 0 },
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
            return result;
        }
    },

    getRevenueChartData: async (period, category) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            let groupByClause = "";
            let selectLabel = "";
            let dateCondition = "";

            // 1. จัดการการ Group By และช่วงเวลาตาม Period
            if (period === 'monthly') {
                // รายเดือน: ดึงยอดขายแยกตาม "วัน" ในเดือนปัจจุบัน
                dateCondition = "YEAR(date_time) = YEAR(CURDATE()) AND MONTH(date_time) = MONTH(CURDATE())";
                selectLabel = "DAY(date_time) AS label";
                groupByClause = "GROUP BY DAY(date_time) ORDER BY DAY(date_time) ASC";
            } else if (period === 'yearly') {
                // รายปี: ดึงยอดขายแยกตาม "เดือน" ในปีปัจจุบัน (1 - 12)
                dateCondition = "YEAR(date_time) = YEAR(CURDATE())";
                selectLabel = "MONTH(date_time) AS label";
                groupByClause = "GROUP BY MONTH(date_time) ORDER BY MONTH(date_time) ASC";
            } else {
                // รายวัน (daily): ดึงยอดขายแยกตาม "ชั่วโมง" ในวันนี้ (0 - 23)
                dateCondition = "DATE(date_time) = CURDATE()";
                selectLabel = "HOUR(date_time) AS label";
                groupByClause = "GROUP BY HOUR(date_time) ORDER BY HOUR(date_time) ASC";
            }

            let sql = "";

            // 2. สร้าง Query ตามประเภท Category
            if (category === 'food') {
                sql = `
                SELECT ${selectLabel}, COALESCE(SUM(total_price), 0) AS total 
                FROM \`order\` 
                WHERE order_status_id = 'Y' AND ${dateCondition}
                ${groupByClause}
            `;
            } else if (category === 'boardgame') {
                sql = `
                SELECT ${selectLabel}, COALESCE(SUM(total_price), 0) AS total 
                FROM bill_game 
                WHERE ${dateCondition}
                ${groupByClause}
            `;
            } else {
                // Category 'all'
                sql = `
                SELECT label, COALESCE(SUM(total), 0) AS total FROM (
                    SELECT ${selectLabel}, SUM(total_price) AS total FROM \`order\` WHERE order_status_id = 'Y' AND ${dateCondition} ${groupByClause}
                    UNION ALL
                    SELECT ${selectLabel}, SUM(total_price) AS total FROM bill_game WHERE ${dateCondition} ${groupByClause}
                ) AS combined
                GROUP BY label
                ORDER BY label ASC
            `;
            }

            const rows = await conn.query(sql);

            // จัดรูปโครงสร้างข้อมูลที่จะส่งกลับ
            const chartData = rows.map(row => ({
                label: String(row.label),
                total: Number(row.total || 0)
            }));

            result = {
                isError: false,
                data: chartData,
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
}