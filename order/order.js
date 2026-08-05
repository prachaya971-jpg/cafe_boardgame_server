const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
     getorderList: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

        
        const sql = `
            SELECT 
                fv.img_food_url AS image,
                o.table_number,
                fl.food_name,
                v.variant_name,
                fo.option_name,
                of.quantity,
                of.base_price,
                ofs.serve_status_name,
                IFNULL(fo.option_price, 0) AS option_price
            FROM \`order\` o
            JOIN order_food of ON o.order_id = of.order_id
            JOIN food_variants fv ON of.food_variant_id = fv.food_variant_id
            JOIN food_list fl ON fv.food_id = fl.food_id
            JOIN food_type_ ft ON fl.food_type_id = ft.food_type_id
            LEFT JOIN variants v ON fv.variant_id = v.variant_id
            LEFT JOIN order_food_status ofs ON of.serve_status_id = ofs.serve_status_id
            LEFT JOIN order_food_options ofo ON of.order_detail_id = ofo.order_detail_id
            LEFT JOIN food_options fo ON ofo.options_id = fo.options_id
            WHERE DATE(o.date_time) = CURDATE() AND of.serve_status_id = 'N'
            ORDER BY o.date_time ASC
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
        }
     }
