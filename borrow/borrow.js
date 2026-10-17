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
    borrowboardgame_borrow: async (barcode, tableNum) => {
        let conn;
        let result;
        try {
            if (!barcode || !tableNum) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: ""
                };
            }

            conn = await pool.getConnection();
            const sql001 = `INSERT INTO borrow (table_number, bgp_id, date_time,borrow_status_id) VALUES (?, ?,NOW(),'N');`;
            const sql002 = `UPDATE board_game_play SET quantity = quantity - 1 WHERE bgp_id = ? AND quantity > 0`;

            const res = await conn.query(sql001, [tableNum, barcode]);
            await conn.query(sql002, [barcode]);
            await conn.commit();

            if (res.affectedRows === 0) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: "ไม่สามารถเพิ่มข้อมูลการยืมได้"
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
    borrowboardgame_cusborrowfetch: async (tableNum) => {
        let conn;
        try {
            if (!tableNum) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: "กรุณาระบุหมายเลขโต๊ะ"
                };
            }

            conn = await pool.getConnection();

            const sql001 = `SELECT 
                                b.borrow_id,
                                b.table_number,
                                b.bgp_id,
                                b.date_time,
                                b.borrow_status_id,
                                bg.bgp_name,
                                bg.img_game_play
                            FROM borrow b
                            INNER JOIN board_game_play bg ON b.bgp_id = bg.bgp_id
                            WHERE b.table_number = ? AND b.borrow_status_id = 'N'
                            ORDER BY b.date_time DESC;`;

            // 🟢 ดึงข้อมูล rows ออกมาตรงๆ
            const rows = await conn.query(sql001, [tableNum]);

            // 🟢 คืนค่าข้อมูลที่ได้ทันที
            return {
                isError: false,
                data: rows,
                errorMessage: ""
            };

        } catch (error) {
            console.error("❌ borrowboardgame_cusborrowfetch Error:", error);
            return {
                isError: true,
                data: null,
                errorMessage: error.message
            };
        } finally {
            // 🟢 คืน Connection เข้า Pool เท่านั้น ไม่ต้องมีคำสั่ง return หรือ commit ในนี้
            if (conn) conn.release();
        }
    },
    returnboardgame_item: async (borrowId, tableNum, dateTime) => {
        let conn;
        try {
            // 🟢 แก้ไขตรงนี้: เปลี่ยนจาก !datetime เป็น !dateTime (T ตัวใหญ่)
            if (!borrowId || !tableNum || !dateTime) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: "ข้อมูลไม่ครบถ้วน (ต้องการ borrow_id, table_number และ date_time)"
                };
            }

            conn = await pool.getConnection();

            // 🟢 1. แปลง dateTime เป็น YYYY-MM-DD HH:mm:ss สำหรับ MySQL
            let formattedDate = dateTime;
            if (typeof dateTime === 'string' && dateTime.includes('T')) {
                const dateObj = new Date(dateTime);
                const pad = (num) => String(num).padStart(2, '0');
                formattedDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
            }

            // 🟢 2. ค้นหา bgp_id โดยเช็กทั้ง borrow_id, table_number และ date_time
            const borrowRows = await conn.query(
                `SELECT bgp_id FROM borrow 
             WHERE borrow_id = ? AND table_number = ? AND DATE_FORMAT(date_time, '%Y-%m-%d %H:%i:%s') = ? AND borrow_status_id = 'N'`,
                [borrowId, tableNum, formattedDate]
            );

            if (!borrowRows || borrowRows.length === 0) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: "ไม่พบรายการยืมนี้ หรือรายการถูกคืนไปแล้ว"
                };
            }

            const bgpId = borrowRows[0].bgp_id;

            // 🟢 3. อัปเดตสถานะการยืมเป็น 'Y'
            await conn.query(
                `UPDATE borrow SET borrow_status_id = 'Y' 
             WHERE borrow_id = ? AND table_number = ? AND DATE_FORMAT(date_time, '%Y-%m-%d %H:%i:%s') = ?`,
                [borrowId, tableNum, formattedDate]
            );

            // 🟢 4. คืนจำนวนสต็อกบอร์ดเกม (+1)
            await conn.query(
                `UPDATE board_game_play SET quantity = quantity + 1 WHERE bgp_id = ?`,
                [bgpId]
            );

            return {
                isError: false,
                data: null,
                errorMessage: ""
            };
        } catch (error) {
            console.error("❌ returnboardgame_item Error:", error);
            return {
                isError: true,
                data: null,
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
        }
    },
    borrowboardgame_cusreturnall: async (tableNum) => {
        let conn;
        try {
            if (!tableNum) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: "กรุณาระบุหมายเลขโต๊ะ (table_number)"
                };
            }

            conn = await pool.getConnection();

            // 1. ค้นหา bgp_id ทั้งหมดของโต๊ะนี้ที่ยังไม่ได้คืน (borrow_status_id = 'N')
            const borrowRows = await conn.query(
                `SELECT bgp_id FROM borrow WHERE table_number = ? AND borrow_status_id = 'N'`,
                [tableNum]
            );

            if (!borrowRows || borrowRows.length === 0) {
                return {
                    isError: true,
                    data: null,
                    errorMessage: "ไม่พบรายการยืมค้างชำระของโต๊ะนี้"
                };
            }

            // 2. อัปเดตสถานะการยืมทั้งหมดของโต๊ะนี้เป็น 'Y' (คืนแล้ว)
            await conn.query(
                `UPDATE borrow SET borrow_status_id = 'Y' WHERE table_number = ? AND borrow_status_id = 'N'`,
                [tableNum]
            );

            // 3. วนลูปคืนจำนวนสต็อกบอร์ดเกม (+1) ทีละรายการ
            for (const item of borrowRows) {
                await conn.query(
                    `UPDATE board_game_play SET quantity = quantity + 1 WHERE bgp_id = ?`,
                    [item.bgp_id]
                );
            }

            return {
                isError: false,
                data: null,
                errorMessage: ""
            };

        } catch (error) {
            console.error("❌ returnboardgame_all Error:", error);
            return {
                isError: true,
                data: null,
                errorMessage: error.message
            };
        } finally {
            if (conn) conn.release();
        }
    }
}