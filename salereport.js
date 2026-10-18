const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    // --- ในไฟล์ Controller / Model ---
    getsalereport: async (searchDate) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            let sql = `SELECT * FROM v_sale_report`;
            let params = [];

            if (searchDate) {
                sql += ` WHERE DATE(date_time) = ?`;
                params.push(searchDate);
            }

            const rows = await conn.query(sql, params);
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

    getsalereportdetail: async (order_id) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            let sql = `SELECT * FROM v_sale_report`;
            let params = [];

            if (searchDate) {
                sql += ` WHERE DATE(date_time) = ?`;
                params.push(searchDate);
            }

            const rows = await conn.query(sql, params);
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
    getboardgamesalereport: async (searchDate) => {
        let conn;
        try {
            conn = await pool.getConnection();

            let sql = `SELECT 
                            bill_game.sale_bg_id,
                            bill_game.date_time,
                            bill_game.total_price,
                            IFNULL(CONCAT(employee.emp_first_name, ' ', employee.emp_last_name), 'ไม่ระบุพนักงาน') AS emp_name,
                            employee.emp_first_name,
                            employee.emp_last_name
                        FROM bill_game 
                        INNER JOIN employee ON employee.emp_id = bill_game.emp_id`;
            let params = [];

            if (searchDate) {
                sql += ` WHERE DATE(bill_game.date_time) = ?`;
                params.push(searchDate);
            }

            const rows = await conn.query(sql, params);
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

    // let sql = `SELECT 
    //                         board_game_sale.bg_name,
    //                         bill_game.date_time,
    //                         bill_game_detail.total_price,
    //                         bill_game.emp_id,
    //                         bill_game_detail.unit_price,
    //                         IFNULL(CONCAT(employee.emp_first_name, ' ', employee.emp_last_name), 'ไม่ระบุพนักงาน') AS emp_name,
    //                         employee.emp_first_name,
    //                         employee.emp_last_name
    //                     FROM bill_game 
    //                     INNER JOIN bill_game_detail ON bill_game.sale_bg_id = bill_game_detail.sale_bg_id
    //                     INNER JOIN board_game_sale ON bill_game_detail.bg_id = board_game_sale.bg_id
    //                     INNER JOIN employee ON employee.emp_id = bill_game.emp_id`;
    //         let params = [];
}