const pool = require('../libs/db_pool');

module.exports = {
    getBorrowReportList: async (period = 'all') => {
    let conn;
    let result;
    try {
        conn = await pool.getConnection();

        let wheresql = "";

        if (period === 'daily') {
            wheresql = "WHERE DATE(borrow.date_time) = CURDATE()";
        } else if (period === 'unreturn') {
            wheresql = "WHERE borrow.borrow_status_id = 'N'";
        } else {
            wheresql = "WHERE DATE(borrow.date_time) = CURDATE() OR borrow.borrow_status_id = 'N'"; 
        }

        const sql = `
            SELECT 
                borrow.borrow_id, 
                borrow.table_number, 
                board_game_play.bgp_name, 
                board_game_play.img_game_play AS image,
                borrow.date_time, 
                borrow_status.borrow_status_name
            FROM borrow
            INNER JOIN board_game_play ON borrow.bgp_id = board_game_play.bgp_id 
            INNER JOIN borrow_status ON borrow.borrow_status_id = borrow_status.borrow_status_id
            ${wheresql}
            ORDER BY borrow.date_time DESC
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
}