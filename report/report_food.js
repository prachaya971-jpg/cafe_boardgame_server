const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getfood: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_food_list
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
    deletefood: async (food_id, food_variant_id) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            const sqlop = "DELETE FROM food_menu_options WHERE food_variant_id = ?";
            await conn.query(sqlop, [food_variant_id]);


            const sql = "DELETE FROM food_variants WHERE food_variant_id = ?";
            await conn.query(sql, [food_variant_id]);

            const remainingVariants = await conn.query(
                "SELECT COUNT(*) AS total FROM food_variants WHERE food_id = ?",
                [food_id]
            );

            const total = Number(remainingVariants[0]?.total ?? remainingVariants?.total ?? 0);

            if (total === 0) {
                await conn.query("DELETE FROM food_list WHERE food_id = ?", [food_id]);
            }

            await conn.commit();

            result = {
                isError: false,
                data: { message: "" },
                errorMessage: ""
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

    updateVariant: async (foodData) => {
        let conn;
        let result;
        try {
            const { food_id, food_variant_id, food_name, food_type_id, food_variant_price, option_ids, img_food_url } = foodData;


            conn = await pool.getConnection();
            await conn.beginTransaction();

            // 1. อัปเดตชื่ออาหารหลัก
            await conn.query(
                "UPDATE food_list SET food_name = ?, food_type_id = ? WHERE food_id = ?",
                [food_name.trim(), food_type_id, food_id]
            );

            // 2. อัปเดตราคา และ รูปภาพ
            if (img_food_url) {
                await conn.query(
                    "UPDATE food_variants SET food_variant_price = ?, img_food_url = ? WHERE food_variant_id = ?",
                    [food_variant_price, img_food_url, food_variant_id]
                );
            } else {
                await conn.query(
                    "UPDATE food_variants SET food_variant_price = ? WHERE food_variant_id = ?",
                    [food_variant_price, food_variant_id]
                );
            }

            // 3. ลบท็อปปิ้งเดิมออก
            await conn.query(
                "DELETE FROM food_menu_options WHERE food_variant_id = ?",
                [food_variant_id]
            );

            // 4. บันทึกท็อปปิ้งใหม่ (แก้ไขจุด Syntax Error)
            if (option_ids && option_ids.length > 0) {
                const placeholders = option_ids.map(() => "(?, ?)").join(", ");
                const sqlOptions = `INSERT INTO food_menu_options (food_variant_id, options_id) VALUES ${placeholders}`;

                const flatParams = [];
                for (const optId of option_ids) {
                    flatParams.push(food_variant_id, Number(optId));
                }

                await conn.query(sqlOptions, flatParams);
            }

            await conn.commit();

            result = {
                isError: false,
                data: { message: "อัปเดตข้อมูลสำเร็จ" },
                errorMessage: ""
            };
        } catch (error) {
            if (conn) await conn.rollback();
            console.error("Error in updateVariant Model:", error);
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
     updatestatusfood: async ({ food_variant_id, food_status_id }) => {
        let conn;
        try {
           

            conn = await pool.getConnection();
            const sql = `
            UPDATE food_variants 
            SET food_status_id = ? 
            WHERE food_variant_id = ?
        `;
            const res = await conn.query(sql, [food_status_id, food_variant_id]);
            const affectedRows = res.affectedRows ?? res[0]?.affectedRows ?? 0;

            return {
                isError: false,
                data: {
                    food_variant_id: food_variant_id,
                    food_status_id: food_status_id,
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


};