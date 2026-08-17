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
                     WHERE of.serve_status_id = 'N' AND DATE(of.date_time) = CURDATE() AND o.order_status_id = 'N'`;

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
                     WHERE status_advice_id = 'N' AND DATE(date_time) = CURDATE()`;

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
                     WHERE borrow_status_id = 'N' AND DATE(date_time) = CURDATE()`;

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

            let dateCondition = "";
            let labelColumn = "";

            // 1. กำหนดเงื่อนไขเวลาและ Column Label ตาม Period
            if (period === 'monthly') {
                // รายเดือน: ยอดขายแยกตาม "วัน" 
                dateCondition = "YEAR(date_time) = YEAR(CURDATE()) AND MONTH(date_time) = MONTH(CURDATE())";
                labelColumn = "DAY(date_time)";
            } else if (period === 'yearly') {
                // รายปี: ยอดขายแยกตาม "เดือน" ใ
                dateCondition = "YEAR(date_time) = YEAR(CURDATE())";
                labelColumn = "MONTH(date_time)";
            } else {
                // รายวัน (daily): ยอดขายแยกตาม "ชั่วโมง"
                dateCondition = "DATE(date_time) = CURDATE()";
                labelColumn = "HOUR(date_time)";
            }

            let sql = "";

            // 2. สร้าง Query ตามประเภท Category
            if (category === 'food') {
                sql = `
                SELECT ${labelColumn} AS label, COALESCE(SUM(total_price), 0) AS total 
                FROM \`order\` 
                WHERE order_status_id = 'Y' AND ${dateCondition}
                GROUP BY ${labelColumn}
                ORDER BY ${labelColumn} ASC
            `;
            } else if (category === 'boardgame') {
                sql = `
                SELECT ${labelColumn} AS label, COALESCE(SUM(total_price), 0) AS total 
                FROM bill_game 
                WHERE ${dateCondition}
                GROUP BY ${labelColumn}
                ORDER BY ${labelColumn} ASC
            `;
            } else {

                sql = `
                SELECT label, COALESCE(SUM(total), 0) AS total 
                FROM (
                    SELECT ${labelColumn} AS label, SUM(total_price) AS total 
                    FROM \`order\` 
                    WHERE order_status_id = 'Y' AND ${dateCondition} 
                    GROUP BY ${labelColumn}

                    UNION ALL

                    SELECT ${labelColumn} AS label, SUM(total_price) AS total 
                    FROM bill_game 
                    WHERE ${dateCondition} 
                    GROUP BY ${labelColumn}
                ) AS combined
                GROUP BY label
                ORDER BY CAST(label AS UNSIGNED) ASC
            `;
            }

            const rows = await conn.query(sql);

            // จัดรูปโครงสร้างข้อมูลก่อนส่งกลับ
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

    
   gettopproducts: async (period, category, limit) => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();

        // 1. เงื่อนไขช่วงเวลา
        let orderDateCond = "DATE(o.date_time) = CURDATE()";
        let billDateCond = "DATE(bg.date_time) = CURDATE()";
        let borrowDateCond = "DATE(bw.date_time) = CURDATE()";

        if (period === 'monthly') {
            orderDateCond = "YEAR(o.date_time) = YEAR(CURDATE()) AND MONTH(o.date_time) = MONTH(CURDATE())";
            billDateCond = "YEAR(bg.date_time) = YEAR(CURDATE()) AND MONTH(bg.date_time) = MONTH(CURDATE())";
            borrowDateCond = "YEAR(bw.date_time) = YEAR(CURDATE()) AND MONTH(bw.date_time) = MONTH(CURDATE())";
        } else if (period === 'yearly') {
            orderDateCond = "YEAR(o.date_time) = YEAR(CURDATE())";
            billDateCond = "YEAR(bg.date_time) = YEAR(CURDATE())";
            borrowDateCond = "YEAR(bw.date_time) = YEAR(CURDATE())";
        }

        let sql = "";
        const limitValue = Number(limit) || 5;

        // 2. แยก Query ตาม Category
        if (category === 'food') {
            sql = `
                SELECT 
                    CONCAT(f.food_name, IFNULL(CONCAT(' (', v.variant_name, ')'), '')) AS product_name,
                    fv.img_food_url AS image,
                    ft.food_type_name AS category,
                    SUM(of.quantity) AS total_quantity,
                    SUM(of.quantity * of.base_price) AS total_revenue
                FROM order_food of
                JOIN \`order\` o ON of.order_id = o.order_id
                JOIN food_variants fv ON of.food_variant_id = fv.food_variant_id
                JOIN food_list f ON fv.food_id = f.food_id
                JOIN food_type_ ft ON f.food_type_id = ft.food_type_id
                LEFT JOIN variants v ON fv.variant_id = v.variant_id
                WHERE ${orderDateCond} AND of.pay_status_id = 'Y'
                GROUP BY fv.food_variant_id
                ORDER BY total_quantity DESC
                LIMIT ${limitValue}
            `;
        } else if (category === 'boardgame') {
            sql = `
                SELECT 
                    bgs.bg_name AS product_name,
                    bgs.img_game_sale AS image,
                    'boardgame' AS category,
                    SUM(bgd.quantity) AS total_quantity,
                    SUM(bgd.quantity * bgd.unit_price) AS total_revenue
                FROM bill_game bg
                JOIN bill_game_detail bgd ON bg.sale_bg_id = bgd.sale_bg_id
                JOIN board_game_sale bgs ON bgd.bg_id = bgs.bg_id
                WHERE ${billDateCond}
                GROUP BY bgs.bg_id
                ORDER BY total_quantity DESC
                LIMIT ${limitValue}
            `;
        } else if (category === 'borrow') {
            sql = `
                SELECT 
                    bgp.bgp_name AS product_name,
                    bgp.img_game_play AS image,
                    'borrow' AS category,
                    COUNT(bw.borrow_id) AS total_quantity,
                    0 AS total_revenue
                FROM borrow bw
                JOIN board_game_play bgp ON bw.bgp_id = bgp.bgp_id
                WHERE ${borrowDateCond}
                GROUP BY bgp.bgp_id
                ORDER BY total_quantity DESC
                LIMIT ${limitValue}
            `;
        }

        const rows = await conn.query(sql);

        const formattedData = rows.map(item => ({
            product_name: item.product_name,
            image: item.image || '',
            category: item.category,
            total_quantity: Number(item.total_quantity || 0),
            total_revenue: Number(item.total_revenue || 0)
        }));

        result = {
            isError: false,
            data: formattedData,
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