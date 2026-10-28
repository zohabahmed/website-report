import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { WebsiteReport, AuthUser } from '../types/index.js';
import bcrypt from 'bcryptjs';

export interface ReportFilterOptions {
  search?: string;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export class DatabaseRepository {
  private pool: mysql.Pool | null = null;
  private isMySql: boolean = false;
  private jsonFilePath: string;

  constructor() {
    this.jsonFilePath = path.resolve(process.cwd(), 'data', 'reports-db.json');
    this.ensureJsonDirectory();
  }

  private ensureJsonDirectory() {
    const dir = path.dirname(this.jsonFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.jsonFilePath)) {
      const initialData = {
        users: [],
        reports: [],
      };
      fs.writeFileSync(this.jsonFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }

  public async initialize(): Promise<void> {
    const dbHost = process.env.DB_HOST;
    const dbUser = process.env.DB_USER;
    const dbName = process.env.DB_NAME;
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

    if (process.env.DB_CONNECTION === 'mysql' || (dbHost && dbUser && dbName)) {
      try {
        console.log(`[DB] Attempting MySQL connection to ${dbHost}:${dbPort}/${dbName}...`);
        this.pool = mysql.createPool({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
          database: dbName,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });

        // Test connection
        const conn = await this.pool.getConnection();
        conn.release();
        this.isMySql = true;
        console.log('[DB] Connected to MySQL successfully.');
        await this.runMySqlMigrations();
        return;
      } catch (err: any) {
        console.warn(`[DB] MySQL connection failed (${err.message}). Falling back to local persistent JSON store.`);
        this.isMySql = false;
        this.pool = null;
      }
    } else {
      console.log('[DB] Running with local persistent data store (MySQL credentials not provided in .env).');
      this.isMySql = false;
    }
  }

  private async runMySqlMigrations() {
    if (!this.pool) return;
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createReportsTable = `
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

    await this.pool.query(createUsersTable);
    await this.pool.query(createReportsTable);
    console.log('[DB] MySQL schema initialized successfully.');
  }

  // File fallback helpers
  private readJsonData(): { users: any[]; reports: WebsiteReport[] } {
    this.ensureJsonDirectory();
    try {
      const data = fs.readFileSync(this.jsonFilePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { users: [], reports: [] };
    }
  }

  private writeJsonData(data: { users: any[]; reports: WebsiteReport[] }) {
    this.ensureJsonDirectory();
    fs.writeFileSync(this.jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // --- Reports operations ---

  public async getReports(options: ReportFilterOptions = {}): Promise<WebsiteReport[]> {
    const { search, sortBy = 'created_at', sortOrder = 'desc' } = options;

    if (this.isMySql && this.pool) {
      let query = 'SELECT * FROM reports';
      const params: any[] = [];

      if (search && search.trim().length > 0) {
        query += ' WHERE website_url LIKE ? OR website_name LIKE ? OR client_name LIKE ?';
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      const column = sortBy === 'updated_at' ? 'updated_at' : 'created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${column} ${order}`;

      const [rows] = await this.pool.query(query, params);
      return (rows as any[]).map(this.mapDbRowToReport);
    }

    // Local JSON
    const data = this.readJsonData();
    let list = [...data.reports];

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.websiteUrl.toLowerCase().includes(q) ||
          r.websiteName.toLowerCase().includes(q) ||
          (r.clientName && r.clientName.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      const timeA = new Date(sortBy === 'updated_at' ? a.updatedAt : a.createdAt).getTime();
      const timeB = new Date(sortBy === 'updated_at' ? b.updatedAt : b.createdAt).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }

  public async getReportById(id: string): Promise<WebsiteReport | null> {
    if (this.isMySql && this.pool) {
      const [rows] = await this.pool.query('SELECT * FROM reports WHERE id = ? LIMIT 1', [id]);
      const list = rows as any[];
      if (list.length === 0) return null;
      return this.mapDbRowToReport(list[0]);
    }

    const data = this.readJsonData();
    const found = data.reports.find((r) => r.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async createReport(report: WebsiteReport): Promise<WebsiteReport> {
    if (this.isMySql && this.pool) {
      const query = `
        INSERT INTO reports (
          id, website_url, website_name, client_name, report_date, prepared_by,
          total_tasks, completed_tasks, incomplete_tasks, completion_percentage,
          tasks_json, wordpress_users_json, executive_summary, final_summary,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.pool.query(query, [
        report.id,
        report.websiteUrl,
        report.websiteName,
        report.clientName || null,
        report.reportDate,
        report.preparedBy || null,
        report.totalTasks,
        report.completedTasks,
        report.incompleteTasks,
        report.completionPercentage,
        JSON.stringify(report.tasks),
        JSON.stringify(report.wordpressUsers),
        report.executiveSummary,
        report.finalSummary,
        report.createdAt,
        report.updatedAt,
      ]);
      return report;
    }

    const data = this.readJsonData();
    data.reports.push(report);
    this.writeJsonData(data);
    return report;
  }

  public async updateReport(id: string, updates: Partial<WebsiteReport>): Promise<WebsiteReport | null> {
    const existing = await this.getReportById(id);
    if (!existing) return null;

    // Preserve original creation date as required by specification
    const updated: WebsiteReport = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMySql && this.pool) {
      const query = `
        UPDATE reports SET
          website_url = ?,
          website_name = ?,
          client_name = ?,
          report_date = ?,
          prepared_by = ?,
          total_tasks = ?,
          completed_tasks = ?,
          incomplete_tasks = ?,
          completion_percentage = ?,
          tasks_json = ?,
          wordpress_users_json = ?,
          executive_summary = ?,
          final_summary = ?,
          updated_at = ?
        WHERE id = ?
      `;
      await this.pool.query(query, [
        updated.websiteUrl,
        updated.websiteName,
        updated.clientName || null,
        updated.reportDate,
        updated.preparedBy || null,
        updated.totalTasks,
        updated.completedTasks,
        updated.incompleteTasks,
        updated.completionPercentage,
        JSON.stringify(updated.tasks),
        JSON.stringify(updated.wordpressUsers),
        updated.executiveSummary,
        updated.finalSummary,
        updated.updatedAt,
        id,
      ]);
      return updated;
    }

    const data = this.readJsonData();
    const index = data.reports.findIndex((r) => r.id === id);
    if (index === -1) return null;
    data.reports[index] = updated;
    this.writeJsonData(data);
    return updated;
  }

  public async deleteReport(id: string): Promise<boolean> {
    if (this.isMySql && this.pool) {
      const [res] = await this.pool.query('DELETE FROM reports WHERE id = ?', [id]);
      return (res as any).affectedRows > 0;
    }

    const data = this.readJsonData();
    const index = data.reports.findIndex((r) => r.id === id);
    if (index === -1) return false;
    data.reports.splice(index, 1);
    this.writeJsonData(data);
    return true;
  }

  // --- Auth / User operations ---

  public async findUserByEmail(email: string): Promise<any | null> {
    if (this.isMySql && this.pool) {
      const [rows] = await this.pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
      const list = rows as any[];
      return list[0] || null;
    }

    const data = this.readJsonData();
    return data.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public async createUser(user: { id: string; email: string; passwordHash: string; name: string; role: string }): Promise<any> {
    if (this.isMySql && this.pool) {
      await this.pool.query(
        'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
        [user.id, user.email.toLowerCase(), user.passwordHash, user.name, user.role]
      );
      return user;
    }

    const data = this.readJsonData();
    data.users.push(user);
    this.writeJsonData(data);
    return user;
  }

  public async ensureAdminUser(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@maintenance.com';
    const existing = await this.findUserByEmail(adminEmail);
    if (!existing) {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123456';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(defaultPassword, salt);
      await this.createUser({
        id: 'user-admin-default',
        email: adminEmail,
        passwordHash: hash,
        name: 'Administrator',
        role: 'admin',
      });
      console.log(`[DB] Created default admin user: ${adminEmail} (password: ${defaultPassword})`);
    }
  }

  private mapDbRowToReport(row: any): WebsiteReport {
    return {
      id: row.id,
      websiteUrl: row.website_url,
      websiteName: row.website_name,
      clientName: row.client_name || undefined,
      reportDate: row.report_date,
      preparedBy: row.prepared_by || undefined,
      totalTasks: row.total_tasks,
      completedTasks: row.completed_tasks,
      incompleteTasks: row.incomplete_tasks,
      completionPercentage: row.completion_percentage,
      tasks: typeof row.tasks_json === 'string' ? JSON.parse(row.tasks_json) : row.tasks_json,
      wordpressUsers:
        typeof row.wordpress_users_json === 'string'
          ? JSON.parse(row.wordpress_users_json)
          : row.wordpress_users_json,
      executiveSummary: row.executive_summary || '',
      finalSummary: row.final_summary || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const db = new DatabaseRepository();
