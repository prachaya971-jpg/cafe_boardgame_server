const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');

module.exports ={
    getUserAccountById: async (accountId) =>{
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            var sql = "SELECT * FROM employee" + "WHERE emp = ?";

            var rows = await conn.query(sql,[accountId]);

            result ={
                isError: false,
                data:rows
            };
        } catch (error) {
            result ={
                isError: false,
                errorMassage: error.message
            }
        } finally{
            if(conn)
                conn.release();
            return result;
        }

    }
}