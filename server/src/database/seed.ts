import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { db } from './repository.js';
import { getDefaultTasks } from '../utils/defaultTasks.js';
import { calculateStats, generateExecutiveSummary, generateFinalSummary } from '../utils/summaryGenerator.js';
import { WebsiteReport } from '../types/index.js';

dotenv.config();

async function seedData() {
  await db.initialize();
  await db.ensureAdminUser();

  const existingReports = await db.getReports();
  if (existingReports.length > 0) {
    console.log(`[Seed] Database already contains ${existingReports.length} reports. Skipping seed.`);
    return;
  }

  console.log('[Seed] Seeding sample website maintenance reports...');

  // Sample Report 1: 75% completed (matches prompt example)
  const tasks1 = getDefaultTasks();
  tasks1[0].status = 'Done'; // Plugin Upgrade
  tasks1[0].notes = 'Updated WooCommerce (9.4.0), Yoast SEO (23.9), and Elementor (3.25.1). Compatibility tested in staging.';
  tasks1[1].status = 'Done'; // Theme Upgrade
  tasks1[1].notes = 'Astra Pro theme updated to v4.8.2. Child theme template overrides verified.';
  tasks1[2].status = 'Undone'; // WP-Config Code
  tasks1[2].notes = 'Pending security salts update and memory limit raise to 512M.';
  tasks1[2].meta = { configChanges: 'Pending WP_MEMORY_LIMIT and DISALLOW_FILE_EDIT' };
  tasks1[3].status = 'Done'; // PHP Version
  tasks1[3].notes = 'Server upgraded to PHP 8.3 with OPcache active.';
  tasks1[3].meta = { phpVersion: 'PHP 8.3' };
  tasks1[4].status = 'Done'; // 2FA
  tasks1[4].notes = 'Configured via Wordfence 2FA for all users with Administrator and Editor roles.';
  tasks1[5].status = 'Done'; // User Accounts
  tasks1[5].notes = 'Audited 3 administrative accounts. Stale developer credentials removed.';
  tasks1[6].status = 'Undone'; // Elastic Email
  tasks1[6].notes = 'DNS SPF and DKIM verified; SMTP test email queue still pending client verification.';
  tasks1[7].status = 'Done'; // Website QA
  tasks1[7].notes = 'Checkout flow, gravity forms, SSL certificate, and responsive mobile navigation fully tested.';
  tasks1[7].meta = {
    qaChecks: {
      accessibility: true,
      navigation: true,
      forms: true,
      responsive: true,
      performance: true,
      criticalFunctions: true,
    },
  };
  tasks1[8].status = 'Done'; // WordPress Core
  tasks1[8].notes = 'WordPress Core updated to 6.7.1 without database errors.';
  tasks1[8].meta = { wpVersion: '6.7.1' };
  tasks1[9].status = 'Done'; // WP-Hide
  tasks1[9].notes = 'Admin login path obfuscated and WordPress generator footprints hidden.';

  // Add 3 custom tasks
  tasks1.push(
    {
      id: uuidv4(),
      name: 'Off-site Cloud Backup',
      description: 'Run full snapshot of database and uploads to AWS S3 prior to updates.',
      status: 'Done',
      notes: 'Full snapshot (1.4 GB) verified in AWS S3 Frankfurt bucket.',
      isCustom: true,
      orderIndex: 10,
    },
    {
      id: uuidv4(),
      name: 'Malware & Security Scan',
      description: 'Deep integrity scan of core files and wp-content uploads folder.',
      status: 'Done',
      notes: 'Zero malware signatures found. File integrity check 100% clean.',
      isCustom: true,
      orderIndex: 11,
    },
    {
      id: uuidv4(),
      name: 'Cloudflare CDN Cache Purge & SSL Validation',
      description: 'Purge edge cache and verify TLS 1.3 full encryption mode.',
      status: 'Undone',
      notes: 'Pending edge cache purge verification after staging review.',
      isCustom: true,
      orderIndex: 12,
    }
  );

  const stats1 = calculateStats(tasks1);
  const date1 = '2026-10-28';
  const report1: WebsiteReport = {
    id: uuidv4(),
    websiteUrl: 'https://example.com',
    websiteName: 'Example Storefront',
    clientName: 'Acme Global Commerce',
    reportDate: date1,
    preparedBy: 'DevOps Senior Engineer',
    totalTasks: stats1.totalTasks,
    completedTasks: stats1.completedTasks,
    incompleteTasks: stats1.incompleteTasks,
    completionPercentage: stats1.completionPercentage,
    tasks: tasks1,
    wordpressUsers: [
      {
        id: uuidv4(),
        username: 'acme_admin',
        email: 'ops@example.com',
        role: 'Administrator',
        twoFactorStatus: 'Enabled',
        notes: 'Primary IT Contact',
      },
      {
        id: uuidv4(),
        username: 'marketing_lead',
        email: 'editor@example.com',
        role: 'Editor',
        twoFactorStatus: 'Enabled',
        notes: 'Marketing team publisher',
      },
      {
        id: uuidv4(),
        username: 'support_staff',
        email: 'help@example.com',
        role: 'Author',
        twoFactorStatus: 'Disabled',
        notes: 'Requires 2FA activation next cycle',
      },
    ],
    executiveSummary: generateExecutiveSummary('https://example.com', date1, tasks1),
    finalSummary: generateFinalSummary(tasks1),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Sample Report 2: 100% completed report
  const tasks2 = getDefaultTasks();
  tasks2.forEach((t) => {
    t.status = 'Done';
    t.notes = 'Verified and completed according to standard operating procedures.';
  });
  tasks2[3].meta = { phpVersion: 'PHP 8.3' };
  tasks2[8].meta = { wpVersion: '6.7.1' };
  const stats2 = calculateStats(tasks2);
  const date2 = '2026-10-27';
  const report2: WebsiteReport = {
    id: uuidv4(),
    websiteUrl: 'https://techcorp-consulting.io',
    websiteName: 'TechCorp Consulting',
    clientName: 'TechCorp International',
    reportDate: date2,
    preparedBy: 'Maintenance Lead',
    totalTasks: stats2.totalTasks,
    completedTasks: stats2.completedTasks,
    incompleteTasks: stats2.incompleteTasks,
    completionPercentage: stats2.completionPercentage,
    tasks: tasks2,
    wordpressUsers: [
      {
        id: uuidv4(),
        username: 'sysadmin_tc',
        email: 'sysadmin@techcorp-consulting.io',
        role: 'Administrator',
        twoFactorStatus: 'Enabled',
        notes: 'Hardware security key enforced',
      },
    ],
    executiveSummary: generateExecutiveSummary('https://techcorp-consulting.io', date2, tasks2),
    finalSummary: generateFinalSummary(tasks2),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  };

  await db.createReport(report1);
  await db.createReport(report2);

  console.log('[Seed] Sample reports seeded successfully!');
}

seedData().catch(console.error);
