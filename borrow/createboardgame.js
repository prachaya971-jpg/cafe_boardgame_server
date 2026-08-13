const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
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