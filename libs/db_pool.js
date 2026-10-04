const mariadb = require('mariadb');
const pool =mariadb.createPool({
    host:'127.0.0.1',
    user:'root',
    password: '888',
    port: 3306,
    connectionLimit:5,
    

    database: 'cafe_boardgame',
    bigIntAsNumber: true
});

module.exports=pool;