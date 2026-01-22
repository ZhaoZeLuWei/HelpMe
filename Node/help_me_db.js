/* eslint-env node, es2021 */
//this js file to create POOL connection with the database
//import modules (npm install)
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '123456',
  database: 'help_me_db',
  //设置可用的连接池数量
  connectionLimit: 10,
  queueLimit: 0,
  //第十一个连接进入，可以等待
  waitForConnections: true,
  dateStrings: true,
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;
