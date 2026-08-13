const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {

//    createVariant: async (variantData) => {
//     let conn;
//     let result;
//     try {
//         conn = await pool.getConnection();
        
//         const { variant_name } = variantData;

//         var sqlvariant = "INSERT INTO variants (variant_name) VALUES (?)";
        
//         await conn.query(sqlvariant, [variant_name]);

//         result = {
//             isError: false,
//             data: null,
//             errorMessage: ""
//         };

//     } catch (error) {
//         result = {
//             isError: true,
//             data: null,
//             errorMessage: error.message
//         };
//     } finally {

//         if (conn) conn.release();
//         return result;
//     }
// },


// createOption: async (optionData) => {
//     let conn;
//     let result;
//     try {
//         conn = await pool.getConnection();
        
//         const { option_name,options_img, option_price } = optionData;

//         var sqloption = "INSERT INTO food_options (option_name, options_img, option_price) VALUES (?, ?, ?)";
        
//         await conn.query(sqloption, [option_name, options_img, option_price]);

//         result = {
//             isError: false,
//             data: null,
//             errorMessage: ""
//         };

//     } catch (error) {
//         result = {
//             isError: true,
//             data: null,
//             errorMessage: error.message
//         };
//     } finally {

//         if (conn) conn.release();
//         return result;
//     }
// },
boardgamecreateType: async (boardgame_typeName) => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();

        var sqltype = "INSERT INTO catagory_board_game (catagory_bg_name) VALUES (?)";
        
        await conn.query(sqltype, [boardgame_typeName]);

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
    


}
