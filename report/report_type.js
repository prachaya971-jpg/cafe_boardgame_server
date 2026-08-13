const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getType: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT 
                    food_type_id,
                    food_type_name
                FROM food_type_
                ORDER BY food_type_id ASC
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

    
    updateType: async (typeData) => {
        let conn;
        let result;
        try {
            const { food_type_id, food_type_name } = typeData;

            if (!food_type_id || !food_type_name || food_type_name.trim() === "") {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = "UPDATE food_type_ SET food_type_name = ? WHERE food_type_id = ?";
            const res = await conn.query(sql, [food_type_name.trim(), food_type_id]);

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

   
    deleteType: async (food_type_id) => {
        let conn;
        let result;
        try {
            if (!food_type_id) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = "DELETE FROM food_type_ WHERE food_type_id = ?";
            const res = await conn.query(sql, [food_type_id]);


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