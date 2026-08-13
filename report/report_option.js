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
                
                    options_id,
                    option_name,
                    options_img,
                    option_price
                FROM food_options
                ORDER BY options_id ASC
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
            if (!option_id) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = "DELETE FROM food_options WHERE option_id = ?";
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
    }
};