const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getbgborrow: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT bgp_id,bgp_name from board_game_play
                ORDER BY bgp_id ASC
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
    //
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

   
    deletebgborrow: async (bgp_id) => {
        let conn;
        let result;
        try {
            if (!bgp_id) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = "DELETE board_game_play, play_catagory_tag_id FROM board_game_play LEFT JOIN play_catagory_tag_id ON board_game_play.bgp_id = play_catagory_tag_id.bgp_id WHERE board_game_play.bgp_id = ?;";
            const res = await conn.query(sql, [bgp_id]);

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