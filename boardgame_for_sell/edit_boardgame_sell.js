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
                    bgs.bg_id,bgs.bg_name,bgs.quantity,bgs.price,bgs.img_game_sale,
                        GROUP_CONCAT(DISTINCT cbg.catagory_bg_name SEPARATOR ',' ) as "catagorylist",
                        GROUP_CONCAT(DISTINCT bgsb.bgs_barcode_number SEPARATOR ',') AS "barcodelist"
                        FROM board_game_sale bgs
                            LEFT JOIN sale_catagory_tag_id ctbi ON ctbi.bg_id = bgs.bg_id
                            LEFT JOIN catagory_board_game cbg ON cbg.catagory_bg_id = ctbi.catagory_bg_id
                            LEFT JOIN bgs_barcode bgsb ON bgsb.bg_id = bgs.bg_id
                    GROUP BY bgs.bg_id 
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

    updatebgsell: async (boardgame_sell) => {
    let conn;
    let result;
    try {
        const { 
            boardgamesell_id, 
            boardgamesell_name, 
            boardgame_sell_quantity, 
            boardgame_sell_price, 
            sell_img, 
            catagory_id 
        } = boardgame_sell;

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
        if (!boardgamesell_id || !boardgamesell_name || boardgamesell_name.trim() === "") {
            return {
                isError: true,
                data: null,
                errorMessage: ""
            };
        }

        conn = await pool.getConnection();

        const sql001 = "UPDATE board_game_sale SET bg_name = ?, quantity = ?, price = ? WHERE bg_id = ?";
        const res = await conn.query(sql001, [
            boardgamesell_name.trim(), 
            boardgame_sell_quantity, 
            boardgame_sell_price, 
            boardgamesell_id
        ]);

        if (sell_img && sell_img.trim() !== "") {
            const sql002 = "UPDATE board_game_sale SET img_game_sale = ? WHERE bg_id = ?";
            await conn.query(sql002, [sell_img, boardgamesell_id]);
        }
        
        const sql003 = `DELETE FROM sale_catagory_tag_id WHERE bg_id = ?;`;
        await conn.query(sql003, [boardgamesell_id]);

        if (ArrayCategoryId.length > 0) {
            const catagory_bg_id_save = ArrayCategoryId.map(() => "(?, ?)").join(", ");
            const bg_tag_save = `INSERT INTO sale_catagory_tag_id (bg_id, catagory_bg_id) VALUES ${catagory_bg_id_save}`;
            const tagValues = ArrayCategoryId.flatMap(typeid => [boardgamesell_id, Number(typeid)]);

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
            const sql001 = `DELETE FROM sale_catagory_tag_id 
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