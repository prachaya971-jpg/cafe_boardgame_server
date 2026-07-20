const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports ={
    getUserAccountById: async (accountId) =>{
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            var sql = "SELECT * FROM employee WHERE emp_id = ?";

            var rows = await conn.query(sql,[accountId]);

            result ={
                isError: true,
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

    },

    CheckAuthenRequest: async(authenRequest) =>{
        let conn;
        let result;

        try{
            conn = await pool.getConnection();

            var sql = "SELECT emp_id, emp_first_name FROM employee WHERE "
                + "SHA2(CONCAT(emp_id, '&', ?), 256) = ?";

            var rows =await conn.query(sql,[dateUtils.getCurrentDateForToken(),authenRequest]);

            if (rows.length == 0){
                result ={
                    isError: true,
                    errorMassage: "ไม่พบข้อมูลผู้ใช้ในระบบ"
                }
            } else {
                rows[0].account_username = rows[0].emp_first_name;
                result ={
                    isError: false,
                    data: rows
                };
            }
        }catch (error){
            result ={
                isError: true,
                errorMessage: error.message
            }
        } finally{
            if (conn)
                conn.release();
            return result;
        }
    },

    checkAccesRequest: async (authenSignature,authenToken)=>{
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT * FROM employee WHERE "
            + "SHA2(CONCAT(emp_id,'&',password,'&', ?), 256) = ?";

            var rows = await conn.query(sql,[authenToken,authenSignature]);

            if (rows.length == 0){
                result ={
                    isError: true,
                    errorMessage: "รหัสผ่านไม่ถูกต้อง"
                }
            } else {
                result ={
                    isError: false,
                    data: rows
                };
            }
        } catch (error){
            result={
                isError:true,
                data: rows
            }
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },
}
