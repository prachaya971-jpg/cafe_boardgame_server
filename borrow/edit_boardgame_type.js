const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getType: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT catagory_bg_id,catagory_bg_name from catagory_board_game 
                ORDER BY catagory_bg_id ASC
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

    
    updateType: async (typeData) => {
        let conn;
        let result;
        try {
            const { boardgame_type_id, boardgame_type_name } = typeData;

            if (!boardgame_type_id || !boardgame_type_name || boardgame_type_name.trim() === "") {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = "UPDATE catagory_board_game SET catagory_bg_name = ? WHERE catagory_bg_id = ?";
            const res = await conn.query(sql, [boardgame_type_name.trim(), boardgame_type_id]);

            if (res.affectedRows === 0) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

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

   
    deleteType: async (boardgame_type_id) => {
        let conn;
        let result;
        try {
            if (!boardgame_type_id) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = "DELETE FROM catagory_board_game WHERE catagory_bg_id = ?";
            const res = await conn.query(sql, [boardgame_type_id]);

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
    }
};