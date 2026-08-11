require("dotenv").config();

const mysql = require("mysql2");

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

if (process.env.NODE_ENV === "production") {
    dbConfig.ssl = {
        ca: process.env.DB_SSL_CA,
        rejectUnauthorized: true
    };
}

const db = mysql.createConnection(dbConfig);

db.connect((err) => {

    if (err) {
        console.error("Database connection failed:", err);
        return;
    }

    console.log("Connected to MySQL");

});

module.exports = db;