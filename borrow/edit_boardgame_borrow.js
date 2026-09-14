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
                SELECT
                    bgp.bgp_id,bgp.bgp_name,bgp.quantity,bgp.img_game_play,
                        GROUP_CONCAT(cbg.catagory_bg_name SEPARATOR ',' ) as "catagorylist" 
                        FROM board_game_play bgp
                            LEFT JOIN play_catagory_tag_id bgpt ON bgpt.bgp_id = bgp.bgp_id
                            LEFT JOIN catagory_board_game cbg ON cbg.catagory_bg_id = bgpt.catagory_bg_id
                    GROUP BY bgp.bgp_id 
            `;

            // boardgame_borrow_name, boardgame_borrow_quantity, borrow_img, catagory_id
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
            const sql001 = `DELETE FROM play_catagory_tag_id 
                            WHERE bgp_id = ?;`;
         
            const sql002 = `DELETE FROM board_game_play 
                            WHERE bgp_id = ?;`;

            await conn.query(sql001, [bgp_id]);
            await conn.query(sql002, [bgp_id]);
            // const res888 = await conn.query(sql002, [bgp_id]);
            await conn.commit();
            

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