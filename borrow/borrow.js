const pool = require('../libs/db_pool');

module.exports = {
    async getBorrowReportList(period = 'daily', limit = 5) {
    let conn;
    try {
        conn = await pool.getConnection();

            let borrowDate = "WHERE DATE(date_time) = CURDATE()";

            if (period === 'monthly') {
                borrowDate = "WHERE YEAR(date_time) = YEAR(CURDATE()) AND MONTH(date_time) = MONTH(CURDATE())";
            } else if (period === 'yearly') {
                borrowDate = "WHERE YEAR(date_time) = YEAR(CURDATE())";
            }

            const limitValue = Number(limit) || 5;

        const rows = await conn.query(`
            SELECT 
                borrow.borrow_id, 
                borrow.table_number, 
                board_game_play.bgp_name, 
                board_game_play.img_game_play AS image,
                borrow.date_time, 
                borrow_status.borrow_status_name
            FROM borrow
            INNER JOIN board_game_play ON borrow.bgp_id = board_game_play.bgp_id 
            INNER JOIN borrow_status ON borrow.borrow_status_id = borrow_status.borrow_status_id
            ${borrowDate}
            ORDER BY borrow.date_time DESC
            LIMIT ${limitValue}
        `);

        return {
            isError: false,
            data: rows,
            errorMessage: ""
        };
    } catch (err) {
        return {
            isError: true,
            data: [],
            errorMessage: err.message
        };
    } finally {
        if (conn) conn.release();
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
            // const limitValue = Number(limit) || 5;

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
};