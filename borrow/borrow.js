const pool = require('../libs/db_pool');

module.exports = {
    async getBorrowReportList(period = 'daily', limit = 5) {
    let conn;
    try {
        conn = await pool.getConnection();

            let borrowDate = "WHERE DATE(date_time) = CURDATE()";

            if (period === 'monthly') {
                borrowDate = "WHERE YEAR(date_time) = YEAR(CURDATE()) AND MONTH(date_time) = MONTH(CURDATE())";
            } else if (period === 'yearly') {
                borrowDate = "WHERE YEAR(date_time) = YEAR(CURDATE())";
            }

            const limitValue = Number(limit) || 5;

        const rows = await conn.query(`
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
            ${borrowDate}
            ORDER BY borrow.date_time DESC
            LIMIT ${limitValue}
        `);

        return {
            isError: false,
            data: rows,
            errorMessage: ""
        };
    } catch (err) {
        return {
            isError: true,
            data: [],
            errorMessage: err.message
        };
    } finally {
        if (conn) conn.release();
    }
},
};