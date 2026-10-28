import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function runMigrations() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'maintenance_reports';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

  console.log(`[Migration] Connecting to MySQL at ${dbHost}:${dbPort}...`);

  try {
    // First connect without database to ensure database exists
    const adminConn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
    });

    console.log(`[Migration] Creating database "${dbName}" if not exists...`);
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await adminConn.end();

    const conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });

    console.log(`[Migration] Running table schema migrations for "${dbName}"...`);

    const usersTableSql = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const reportsTableSql = `
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(64) PRIMARY KEY,
        website_url VARCHAR(512) NOT NULL,
        website_name VARCHAR(255) NOT NULL,
        client_name VARCHAR(255),
        report_date VARCHAR(20) NOT NULL,
        prepared_by VARCHAR(255),
        total_tasks INT NOT NULL DEFAULT 0,
        completed_tasks INT NOT NULL DEFAULT 0,
        incomplete_tasks INT NOT NULL DEFAULT 0,
        completion_percentage INT NOT NULL DEFAULT 0,
        tasks_json LONGTEXT NOT NULL,
        wordpress_users_json LONGTEXT NOT NULL,
        executive_summary TEXT,
        final_summary TEXT,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        INDEX idx_url (website_url(191)),
        INDEX idx_created (created_at),
        INDEX idx_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await conn.query(usersTableSql);
    await conn.query(reportsTableSql);

    console.log('[Migration] All database migrations completed successfully!');
    await conn.end();
  } catch (err: any) {
    console.error('[Migration Error]', err.message);
    process.exit(1);
  }
}

runMigrations();
