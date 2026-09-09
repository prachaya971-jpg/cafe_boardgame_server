const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getoption: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
               SELECT 
                fo.options_id,
                fo.option_name,
                fo.options_img,
                fo.option_price,
                fo.food_status_id,
                fs.food_status_name
            FROM food_options fo
            JOIN food_status fs ON fo.food_status_id = fs.food_status_id
            ORDER BY fo.options_id ASC;
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


    updateOption: async (optionData) => {
        let conn;
        let result = { isError: false, data: null, errorMessage: "" };
        try {
            const { options_id, option_name, options_img, option_price } = optionData;

            if (!options_id || !option_name || option_name.trim() === "") {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = `
                UPDATE food_options 
                SET option_name = ?, 
                    options_img = COALESCE(?, options_img), 
                    option_price = ? 
                WHERE options_id = ?
            `;
            const res = await conn.query(sql, [
                option_name.trim(),
                options_img,
                option_price,
                options_id
            ]);

            if (res.affectedRows === 0) {
                result = {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }
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


    deleteOption: async (option_id) => {
        let conn;
        let result;
        try {

            conn = await pool.getConnection();
            const sql = "DELETE FROM food_options WHERE options_id = ?";
            const res = await conn.query(sql, [option_id]);


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
    updatestatus: async ({ options_id, food_status_id }) => {
        let conn;
        try {
           
            conn = await pool.getConnection();
            const sql = `
            UPDATE food_options 
            SET food_status_id = ? 
            WHERE options_id = ?
        `;
            const res = await conn.query(sql, [food_status_id, options_id]);
            const affectedRows = res.affectedRows ?? res[0]?.affectedRows ?? 0;

            return {
                isError: false,
                data: {
                    options_id: options_id,
                    food_status_id: food_status_id,
                    affectedRows: Number(affectedRows)
                },
                errorMessage: ""
            };
        } catch (error) {
            return {
                isError: true,
                data: null,
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
        }
    }


};