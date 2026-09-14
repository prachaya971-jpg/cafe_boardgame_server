const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    createboardgame_sell: async (boardgame_sell) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const { boardgame_sell_name, boardgame_sell_quantity, boardgame_sell_price, boardgame_sell_img, catagory_id, boardgame_sell_barcode } = boardgame_sell;

            let ArrayCategoryId = [];
            if (catagory_id) {
                if (typeof catagory_id === 'string') {
                    try {
                        ArrayCategoryId = JSON.parse(catagory_id);
                    } catch (e) {
                        ArrayCategoryId = catagory_id.split(',').map(id => id.trim());
                    }
                } else if (Array.isArray(catagory_id)) {
                    ArrayCategoryId = catagory_id;
                }
            }

            await conn.beginTransaction();

            const sqlBoardgame = "INSERT INTO board_game_sale (bg_name, quantity, price, img_game_sale) VALUES (?, ?, ?, ?)";
            const bgsave = await conn.query(sqlBoardgame, [boardgame_sell_name, boardgame_sell_quantity, boardgame_sell_price, boardgame_sell_img]);
            
            const bgid = Number(bgsave.insertId);
            
            const sqlbarcode = "INSERT INTO bgs_barcode (bgs_barcode_number, bg_id) VALUES (?, ?)";
            await conn.query(sqlbarcode, [boardgame_sell_barcode, bgid]);

            if (ArrayCategoryId.length > 0) {
                const catagory_bg_id_save = ArrayCategoryId.map(() => "(?, ?)").join(", ");
                const bg_tag_save = `INSERT INTO catagory_tag_bgs_id (bg_id, catagory_bg_id) VALUES ${catagory_bg_id_save}`;

                const tagValues = ArrayCategoryId.flatMap(typeid => [bgid, Number(typeid)]);

                await conn.query(bg_tag_save, tagValues);
            }

            await conn.commit();

            result = {
                isError: false,
                data: { bg_id: bgid },
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