const Database = require("better-sqlite3");

const db = new Database("db.sqlite");
db.prepare(
  `CREATE TABLE IF NOT EXISTS products(
    id integer primary key autoincrement,
    name text,
    price real,
	quantity integer,
    description text
    )`
).run();
module.exports = db;
