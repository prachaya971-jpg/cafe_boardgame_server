const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    createboardgameborrow: async (boardgame_borrow) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const { boardgame_borrow_name, boardgame_borrow_quantity, borrow_img, catagory_id } = boardgame_borrow;

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

            const sqlBoardgame = "INSERT INTO board_game_play (bgp_name, quantity, img_game_play) VALUES (?, ?, ?)";
            const bgsave = await conn.query(sqlBoardgame, [boardgame_borrow_name, boardgame_borrow_quantity, borrow_img]);
            const bgpid = Number(bgsave.insertId);

            if (ArrayCategoryId.length > 0) {
                const catagory_bg_id_save = ArrayCategoryId.map(() => "(?, ?)").join(", ");
                const bg_tag_save = `INSERT INTO play_catagory_tag_id (bgp_id, catagory_bg_id) VALUES ${catagory_bg_id_save}`;

                const tagValues = ArrayCategoryId.flatMap(typeid => [bgpid, Number(typeid)]);

                await conn.query(bg_tag_save, tagValues);
            }

            await conn.commit();

            result = {
                isError: false,
                data: { bgp_id: bgpid },
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