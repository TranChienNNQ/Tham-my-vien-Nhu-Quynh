"use strict";
require("dotenv").config();

const { Pool } = require("pg");
const logger = require("../utils/logger");
const { cli } = require("winston/lib/winston/config");
const { query } = require("winston");
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || 5432, 10),
  max: parseInt(process.env.DB_POOL_MAX || 20, 10), // max number of clients in the pool
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || 30000, 10),
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT || 30000,
    10
  ), // close and remove clients which have been idle > 30 seconds
};

const pool = new Pool(dbConfig);

pool.on("connect", (client) => {
  logger.info("Client connected to pool");
});
pool.on("remove", (client) => {
  logger.info("Client removed from pool");
});
pool.on("error", (err, client) => {
  logger.error("Unexpected error on idle client", err);
  process.exit(-1);
});

const testConnection = async () => {
  let client = null;
  try {
    client = await pool.connect();
    logger.info("Successfully connected to the database");
    const res = await client.query("SELECT NOW()");
    logger.info(`Database conncetion successful:", ${res.rows[0].now}`);
  } catch (error) {
    logger.error("Error testing connection to the database:", {
      error_message: error.message,
      error_code: error.code,
      db_host: dbConfig.host,
      db_port: dbConfig.port,
      db_name: dbConfig.database,
      db_user: dbConfig.user,
    });
    throw error;
  } finally {
    if (client) {
      client.release();
      logger.info("Database client released back to pool");
    }
  }
};

module.exports = {
  pool,
  query: (text, params) => {
    pool.query(text, params);
  },
  testConnection,
};
