const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {

    createVariant: async (variantData) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            const { variant_name } = variantData;

            var sqlvariant = "INSERT INTO variants (variant_name) VALUES (?)";

            await conn.query(sqlvariant, [variant_name]);

            result = {
                isError: false,
                data: null,
                errorMessage: ""
            };

        } catch (error) {
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


    createOption: async (optionData) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            const { option_name, options_img, option_price } = optionData;

            var sqloption = "INSERT INTO food_options (option_name, options_img, option_price) VALUES (?, ?, ?)";

            await conn.query(sqloption, [option_name, options_img, option_price]);

            result = {
                isError: false,
                data: null,
                errorMessage: ""
            };

        } catch (error) {
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
    createType: async (typeData) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            const { type_name } = typeData;

            var sqltype = "INSERT INTO food_type_ (food_type_name) VALUES (?)";

            await conn.query(sqltype, [type_name]);

            result = {
                isError: false,
                data: null,
                errorMessage: ""
            };

        } catch (error) {
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

    createFood: async (foodData) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

           
            const sqlFood = `INSERT INTO food_list (food_name, food_type_id) VALUES (?, ?)`;
            const foodResult = await conn.query(sqlFood, [
                foodData.food_name,
                foodData.food_type_id
            ]);

            
            const newFoodId = Number(foodResult.insertId ?? foodResult[0]?.insertId);

            
            for (const variant of foodData.variants) {
                const sqlVariant = `
                INSERT INTO food_variants (food_id, variant_id, food_variant_price, img_food_url) 
                VALUES (?, ?, ?, ?)
            `;
                
                const variantResult = await conn.query(sqlVariant, [
                    newFoodId,
                    variant.variant_id,
                    variant.price,
                    variant.img_food_url || ''
                ]);
                const newVariantId = Number(variantResult.insertId ?? variantResult[0]?.insertId);

                // 3. Loop เพิ่มท็อปปิ้ง
                if (variant.option_ids && variant.option_ids.length > 0) {
                    const sqlOption = `
                    INSERT INTO food_menu_options (food_variant_id, options_id) 
                    VALUES (?, ?)
                `;
                    for (const optionId of variant.option_ids) {
                        await conn.query(sqlOption, [newVariantId, optionId]);
                    }
                }
            }

            await conn.commit();

            result = {
                isError: false,
                data: {
                    food_id: newFoodId,
                    ...foodData
                },
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
    }

}
