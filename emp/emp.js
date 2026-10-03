const { isErrored } = require('node:stream');
const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const { error } = require('node:console');

module.exports = {
    getemp: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM v_emp;
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
            if (conn)
                conn.release();

            return result;
        }

    },
    updateempstatus: async (empId, newTempPassword) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();

            const sql = `
           UPDATE employee 
            SET password_status_id = 'N', 
            password = ? 
            WHERE emp_id = ?;
            `;

            const res = await conn.query(sql, [newTempPassword, empId]);
            const affectedRows = res.affectedRows ?? res[0]?.affectedRows ?? 0;

            if (affectedRows === 0) {
                result = {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            } else {
                result = {
                    isError: false,
                    data: { affectedRows: Number(affectedRows) },
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
    deleteemp: async (emp_id) => {
        let conn;
        let result;
        try {
            if (!emp_id) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql = "DELETE FROM employee WHERE emp_id = ?";
            const res = await conn.query(sql, [emp_id]);


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
    updatenewempstatus: async (empId, empstatus) => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            let status = empstatus;
            let sql = '';
            if (status === 'Y') {
                sql = `
                UPDATE employee 
                SET emp_status_id = 'N' 
                WHERE emp_id = ?;
            `;
            } else {
                sql = `
                UPDATE employee 
                SET emp_status_id = 'Y' 
                WHERE emp_id = ?;
            `;
            }

            const res = await conn.query(sql, [empId]);
            const affectedRows = res.affectedRows ?? res[0]?.affectedRows ?? 0;

            if (affectedRows === 0) {
                result = {
                    isError: true,
                    data: null,
                    errorMessage: "ไม่พบข้อมูลพนักงานที่ต้องการอัปเดต"
                };
            } else {
                result = {
                    isError: false,
                    data: { affectedRows: Number(affectedRows) },
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
    getemprole: async () => {
        let conn;
        let result;
        try {
            conn = await pool.getConnection();
            const sql = `
                SELECT * FROM emp_role;
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
            if (conn)
                conn.release();

            return result;
        }
    },

    updateemp: async (empData) => {
        let conn;
        let result = { isError: false, data: null, errorMessage: "" };
        try {
            const { emp_id, emp_first_name, emp_last_name, age, sex, tel, img_emp, emp_role_id } = empData;


            conn = await pool.getConnection();
            const sql = `
                UPDATE employee 
                SET emp_first_name = ?, 
                    emp_last_name = ?, 
                    age = ?, 
                    sex = ?, 
                    tel = ?, 
                    img_emp = COALESCE(?, img_emp), 
                    emp_role_id = ? 
                WHERE emp_id = ?
            `;
            const res = await conn.query(sql, [
                emp_first_name.trim(),
                emp_last_name.trim(),
                age,
                sex,
                tel,
                img_emp,
                emp_role_id,
                emp_id
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
     createemp: async (empData) => {
        let conn;
        let result = { isError: false, data: null, errorMessage: "" };
        try {
            const { user_id, emp_first_name, emp_last_name,password, age, sex, tel, img_emp, emp_role_id } = empData;


            conn = await pool.getConnection();
            const sql = `
               INSERT INTO employee (user_id, emp_first_name, emp_last_name, password, age, sex, tel
               , img_emp, emp_role_id,emp_status_id,password_status_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Y', 'N')
            `;
            const res = await conn.query(sql, [
                user_id.trim(),
                emp_first_name.trim(),
                emp_last_name.trim(),
                password,
                age,
                sex,
                tel,
                img_emp,
                emp_role_id
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
    generateuserid: async () => {
    let conn;
    let result = { isError: false, data: null, errorMessage: "" };
    try {
        conn = await pool.getConnection();

        let isUnique = false;
        let generatedId = "";

        while (!isUnique) {
            const firstDigit = Math.floor(Math.random() * 9) + 1;
            const remainingDigits = Math.floor(Math.random() * 1000000000)
                .toString()
                .padStart(9, "0");
            generatedId = `${firstDigit}${remainingDigits}`;

            const sql = `SELECT emp_id FROM employee WHERE emp_id = ? LIMIT 1`;
            const res = await conn.query(sql, [generatedId]);
            const rows = Array.isArray(res[0]) ? res[0] : res;

            if (rows.length === 0) {
                isUnique = true; 
            }
        }

        result = {
            isError: false,
            data: { emp_id: generatedId },
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