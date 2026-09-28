const { isErrored } = require('node:stream');
const pool = require('../../libs/db_pool');
const dateUtils = require('../../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getmenuList: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_food_list_cus;
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
    getmenuListByid: async (foodvariantid) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_food_list_cus WHERE food_variant_id = ?;
            `;
            const rows = await conn.query(sql, [foodvariantid]);
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
    getmenuoptionByid: async (foodvariantid) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_option WHERE food_variant_id = ?;
            `;
            const rows = await conn.query(sql, [foodvariantid]);
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
    reqorder: async (orderData) => {
        let conn;
        let result = { isError: false, data: null, errorMessage: "" };
        try {
            const { table_number, base_price, quantity, food_variant_id, options } = orderData;

            conn = await pool.getConnection();
            await conn.beginTransaction();



            const sqlFindOrder = `
                SELECT order_id 
                FROM \`order\` 
                WHERE table_number = ? 
                AND order_status_id = 'N' 
                AND DATE(date_time) = CURDATE()
                ORDER BY date_time DESC 
                LIMIT 1
                `;


            const queryResult = await conn.query(sqlFindOrder, [table_number]);

            const rows = Array.isArray(queryResult[0]) ? queryResult[0] : queryResult;

            if (!rows || rows.length === 0 || !rows[0]) {
                throw new Error(`ไม่พบรายการ Order ที่เปิดอยู่ของโต๊ะ ${table_number}`);
            }

            const currentOrderId = rows[0].order_id;

            const sqlInsertFood = `
            INSERT INTO order_food 
            (order_id, base_price, date_time, quantity, food_variant_id, serve_status_id, pay_status_id)
            VALUES (?, ?, NOW(), ?, ?, 'N', 'N')
        `;
            const resFood = await conn.query(sqlInsertFood, [
                currentOrderId,
                base_price,
                quantity,
                food_variant_id
            ]);

            const orderDetailId = Number(resFood.insertId);

            if (options && Array.isArray(options) && options.length > 0) {
                const sqlInsertOption = `
                INSERT INTO order_food_options (order_detail_id, options_id)
                VALUES (?, ?)
            `;

                for (const opt of options) {
                    const optId = opt.options_id || opt.option_id;
                    if (optId) {
                        await conn.query(sqlInsertOption, [orderDetailId, optId]);
                    }
                }
            }

          
            await conn.commit();

            result.data = {
                order_id: Number(currentOrderId),
                order_food_id: Number(orderDetailId)
            };
        } catch (error) {
            if (conn) await conn.rollback();
            result = {
                isError: true,
                data: null,
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
            return result;
        }
    },
}