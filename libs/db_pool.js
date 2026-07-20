const mariadb = require('mariadb');
const pool =mariadb.createPool({
    host:'localhost',
    user:'root',
    password: '0805184971',
    port: 3306,
    connectionLimit:5,

    database: 'cafe_boardgame'
});

module.exports=pool;