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
    // แก้ไขบอร์ดเกมสำหรับยืม
    updatebgborrow: async (boardgame_borrow) => {
        let conn;
        let result;
        try {
            const { boardgameplay_id, boardgame_borrow_quantity, boardgameplay_name, borrow_img, catagory_id } = boardgame_borrow;

            let ArrayCategoryId = [];
            if (catagory_id) {
                if (typeof catagory_id === 'string') {
                    try {
                        ArrayCategoryId = JSON.parse(catagory_id);
                    } catch (e) {
                        ArrayCategoryId = catagory_id.split(',').map(id => id.trim()).filter(Boolean);
                    }
                } else if (Array.isArray(catagory_id)) {
                    ArrayCategoryId = catagory_id;
                }
            }

            if (!boardgameplay_id || !boardgameplay_name || boardgameplay_name.trim() === "") {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql001 = "UPDATE board_game_play SET bgp_name = ?, quantity = ? WHERE bgp_id = ?";
            const res = await conn.query(sql001, [boardgameplay_name.trim(), boardgame_borrow_quantity, boardgameplay_id]);

            if (borrow_img && borrow_img.trim() !== "") {
            const sql002 ="UPDATE board_game_play SET img_game_play = ? WHERE bgp_id = ?";
            await conn.query(sql002, [borrow_img, boardgameplay_id]);
            }
            
            const sql003 = "DELETE FROM play_catagory_tag_id WHERE bgp_id = ?;";
            await conn.query(sql003, [boardgameplay_id]);

            if (ArrayCategoryId.length > 0) {
                const catagory_bg_id_save = ArrayCategoryId.map(() => "(?, ?)").join(", ");
                const bg_tag_save = `INSERT INTO play_catagory_tag_id (bgp_id, catagory_bg_id) VALUES ${catagory_bg_id_save}`;
                const tagValues = ArrayCategoryId.flatMap(typeid => [boardgameplay_id, Number(typeid)]);

                await conn.query(bg_tag_save, tagValues);
            }

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