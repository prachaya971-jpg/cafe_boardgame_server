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

    createFood: async (foodData) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            var sqlfood = "INSERT INTO food_list (food_name, food_type_id) VALUES (?, ?)";

            const [foodlist] = await conn.query(sqlfood, [food_name, food_type_id]);




            result = {
                isError: false,
                data: { foodlist },
                errorMessage: "เพิ่มรายการอาหารสำเร็จ"
            };

        } catch (error) {
            // หากเกิดข้อผิดพลาดให้ Rollback ข้อมูลทั้งหมด
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
