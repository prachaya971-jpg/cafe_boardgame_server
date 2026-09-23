const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getbgsell: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT
                    bgs.bg_id,bgs.bg_name,bgs.quantity,bgs.img_game_sale,
                        GROUP_CONCAT(DISTINCT cbg.catagory_bg_name SEPARATOR ',' ) as "catagorylist",
                        GROUP_CONCAT(DISTINCT bgsb.bgs_barcode_number SEPARATOR ',') AS "barcodelist"
                        FROM board_game_sale bgs
                            LEFT JOIN catagory_tag_bgs_id ctbi ON ctbi.bg_id = bgs.bg_id
                            LEFT JOIN catagory_board_game cbg ON cbg.catagory_bg_id = ctbi.catagory_bg_id
                            LEFT JOIN bgs_barcode bgsb ON bgsb.bg_id = bgs.bg_id
                    GROUP BY bgs.bg_id 
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
    // updateType: async (typeData) => {
    //     let conn;
    //     let result;
    //     try {
    //         const { boardgame_type_id, boardgame_type_name } = typeData;

    //         if (!boardgame_type_id || !boardgame_type_name || boardgame_type_name.trim() === "") {
    //             return {
    //                 isError: true,
    //                 data: null,
    //                 errorMessage: ""
    //             };
    //         }

    //         conn = await pool.getConnection();
    //         const sql = "UPDATE catagory_board_game SET catagory_bg_name = ? WHERE catagory_bg_id = ?";
    //         const res = await conn.query(sql, [boardgame_type_name.trim(), boardgame_type_id]);

    //         if (res.affectedRows === 0) {
    //             return {
    //                 isError: true,
    //                 data: null,
    //                 errorMessage: ""
    //             };
    //         }

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


    deletebgsell: async (bgs_id) => {
        let conn;
        let result;
        try {
            if (!bgs_id) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql001 = `DELETE FROM catagory_tag_bgs_id 
                            WHERE bg_id = ?;`;

            const sql002 = `DELETE FROM bgs_barcode 
                            WHERE bg_id = ?;`;
         
            const sql003 = `DELETE FROM board_game_sale
                            WHERE bg_id = ?;`;

            await conn.query(sql001, [bgs_id]);
            await conn.query(sql002, [bgs_id]);
            await conn.query(sql003, [bgs_id]);
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