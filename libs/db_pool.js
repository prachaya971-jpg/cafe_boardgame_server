const mariadb = require('mariadb');
const pool =mariadb.createPool({
    host:'localhost',
    user:'root',
    password: '888',
    port: 3306,
    connectionLimit:5,
    

    database: 'cafe_boardgame',
    bigIntAsNumber: true
});

module.exports=pool;