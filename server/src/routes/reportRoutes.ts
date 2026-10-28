import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/repository.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getDefaultTasks } from '../utils/defaultTasks.js';
import { calculateStats, generateExecutiveSummary, generateFinalSummary } from '../utils/summaryGenerator.js';
import { generateReportPdf } from '../services/pdfService.js';
import { createReportsWorkbook, syncMasterExcelFile } from '../services/excelService.js';
import { MaintenanceTask, WebsiteReport, WordPressUser } from '../types/index.js';

const router = Router();

// URL Validator
function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
  return pattern.test(trimmed);
}

// Derive website name from URL
function deriveWebsiteName(url: string): string {
  try {
    let clean = url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    clean = clean.split('/')[0].split(':')[0];
    const parts = clean.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return clean;
  } catch {
    return 'Website';
  }
}

// Helper to sanitize any potential secrets
function sanitizeReportData(report: any): WebsiteReport {
  return {
    ...report,
    wordpressUsers: (report.wordpressUsers || []).map((u: WordPressUser) => ({
      id: u.id || uuidv4(),
      username: u.username || '',
      email: u.email || '',
      role: u.role || 'Administrator',
      twoFactorStatus: u.twoFactorStatus || 'Not Verified',
      notes: u.notes || '',
    })),
  };
}

// Background sync helper
async function triggerExcelSync() {
  try {
    const all = await db.getReports();
    await syncMasterExcelFile(all);
  } catch (err) {
    console.warn('[Excel] Background sync warning:', err);
  }
}

// 1. Get default checklist tasks
router.get('/defaults', (req, res) => {
  return res.json({ tasks: getDefaultTasks() });
});

// 2. Generate live summaries on the fly
router.post('/preview-summary', (req, res) => {
  const { websiteUrl, reportDate, tasks } = req.body;
  const taskList: MaintenanceTask[] = Array.isArray(tasks) ? tasks : [];
  const stats = calculateStats(taskList);
  const execSummary = generateExecutiveSummary(
    websiteUrl || 'example.com',
    reportDate || new Date().toISOString().split('T')[0],
    taskList
  );
  const finSummary = generateFinalSummary(taskList);

  return res.json({
    ...stats,
    executiveSummary: execSummary,
    finalSummary: finSummary,
  });
});

// 3. Export Master Monthly Excel Spreadsheet (.xlsx)
router.get('/export/excel', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month } = req.query;
    const reports = await db.getReports();
    const filterMonth = typeof month === 'string' && month.trim() ? month.trim() : undefined;

    const workbook = await createReportsWorkbook(reports, filterMonth);

    const filename = filterMonth
      ? `monthly-website-maintenance-${filterMonth}.xlsx`
      : `all-websites-maintenance-master.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Failed to export Excel workbook:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate Excel sheet.' });
    }
  }
});

// All subsequent routes use authMiddleware (which permits direct access)
router.use(authMiddleware);

// 4. List reports (with search & sort)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, sortBy, sortOrder } = req.query;
    const reports = await db.getReports({
      search: typeof search === 'string' ? search : undefined,
      sortBy: sortBy === 'updated_at' ? 'updated_at' : 'created_at',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });
    return res.json({ reports });
  } catch (err: any) {
    console.error('Failed to get reports:', err);
    return res.status(500).json({ error: 'Failed to retrieve reports from database.' });
  }
});

// 5. Get single report
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = await db.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    return res.json({ report });
  } catch (err: any) {
    console.error('Failed to get report:', err);
    return res.status(500).json({ error: 'Failed to retrieve report.' });
  }
});

// 6. Create new report (automatically records & syncs to master Excel sheet!)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      websiteUrl,
      websiteName,
      clientName,
      reportDate,
      preparedBy,
      tasks,
      wordpressUsers,
      executiveSummary,
      finalSummary,
    } = req.body;

    if (!websiteUrl || !isValidUrl(websiteUrl)) {
      return res.status(400).json({ error: 'A valid website URL is required.' });
    }

    const taskList: MaintenanceTask[] = Array.isArray(tasks) && tasks.length > 0 ? tasks : getDefaultTasks();
    const stats = calculateStats(taskList);
    const dateFormatted = reportDate || new Date().toISOString().split('T')[0];
    const derivedName = websiteName?.trim() || deriveWebsiteName(websiteUrl);

    const execSummary =
      executiveSummary && executiveSummary.trim().length > 0
        ? executiveSummary.trim()
        : generateExecutiveSummary(websiteUrl, dateFormatted, taskList);

    const finSummary =
      finalSummary && finalSummary.trim().length > 0
        ? finalSummary.trim()
        : generateFinalSummary(taskList);

    const now = new Date().toISOString();
    const newReport: WebsiteReport = sanitizeReportData({
      id: uuidv4(),
      websiteUrl: websiteUrl.trim(),
      websiteName: derivedName,
      clientName: clientName?.trim() || undefined,
      reportDate: dateFormatted,
      preparedBy: preparedBy?.trim() || (req.user?.name || undefined),
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      incompleteTasks: stats.incompleteTasks,
      completionPercentage: stats.completionPercentage,
      tasks: taskList,
      wordpressUsers: Array.isArray(wordpressUsers) ? wordpressUsers : [],
      executiveSummary: execSummary,
      finalSummary: finSummary,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await db.createReport(newReport);

    // Sync to master Excel spreadsheet in background
    triggerExcelSync();

    return res.status(201).json({ report: saved });
  } catch (err: any) {
    console.error('Failed to create report:', err);
    return res.status(500).json({ error: 'Failed to save report to database.' });
  }
});

// 7. Update existing report
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await db.getReportById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const {
      websiteUrl,
      websiteName,
      clientName,
      reportDate,
      preparedBy,
      tasks,
      wordpressUsers,
      executiveSummary,
      finalSummary,
    } = req.body;

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      return res.status(400).json({ error: 'A valid website URL is required.' });
    }

    const taskList: MaintenanceTask[] = Array.isArray(tasks) ? tasks : existing.tasks;
    const stats = calculateStats(taskList);
    const dateFormatted = reportDate || existing.reportDate;

    const execSummary =
      executiveSummary !== undefined && executiveSummary.trim().length > 0
        ? executiveSummary.trim()
        : generateExecutiveSummary(websiteUrl || existing.websiteUrl, dateFormatted, taskList);

    const finSummary =
      finalSummary !== undefined && finalSummary.trim().length > 0
        ? finalSummary.trim()
        : generateFinalSummary(taskList);

    const updates: Partial<WebsiteReport> = sanitizeReportData({
      websiteUrl: websiteUrl ? websiteUrl.trim() : existing.websiteUrl,
      websiteName: websiteName ? websiteName.trim() : existing.websiteName,
      clientName: clientName !== undefined ? clientName.trim() : existing.clientName,
      reportDate: dateFormatted,
      preparedBy: preparedBy !== undefined ? preparedBy.trim() : existing.preparedBy,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      incompleteTasks: stats.incompleteTasks,
      completionPercentage: stats.completionPercentage,
      tasks: taskList,
      wordpressUsers: Array.isArray(wordpressUsers) ? wordpressUsers : existing.wordpressUsers,
      executiveSummary: execSummary,
      finalSummary: finSummary,
    });

    const updated = await db.updateReport(req.params.id, updates);

    // Sync to master Excel
    triggerExcelSync();

    return res.json({ report: updated });
  } catch (err: any) {
    console.error('Failed to update report:', err);
    return res.status(500).json({ error: 'Failed to update report.' });
  }
});

// 8. Duplicate report
router.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await db.getReportById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const duplicatedReport: WebsiteReport = {
      ...existing,
      id: uuidv4(),
      websiteName: `${existing.websiteName} (Copy)`,
      reportDate: today,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await db.createReport(duplicatedReport);
    triggerExcelSync();

    return res.status(201).json({ report: saved });
  } catch (err: any) {
    console.error('Failed to duplicate report:', err);
    return res.status(500).json({ error: 'Failed to duplicate report.' });
  }
});

// 9. Delete report
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteReport(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Report not found or already deleted.' });
    }

    triggerExcelSync();
    return res.json({ message: 'Report successfully deleted.' });
  } catch (err: any) {
    console.error('Failed to delete report:', err);
    return res.status(500).json({ error: 'Failed to delete report.' });
  }
});

// 10. Download PDF
router.get('/:id/pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = await db.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const safeUrlSlug = report.websiteUrl
      .replace(/^https?:\/\//i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `maintenance-report-${safeUrlSlug}-${report.reportDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generateReportPdf(report, res);
  } catch (err: any) {
    console.error('Failed to generate PDF:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate PDF document.' });
    }
  }
});

// 11. Download Single Website Excel Report
router.get('/:id/excel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = await db.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const workbook = await createReportsWorkbook([report]);
    const safeUrlSlug = report.websiteUrl
      .replace(/^https?:\/\//i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `maintenance-report-${safeUrlSlug}-${report.reportDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Failed to export single Excel report:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate Excel sheet.' });
    }
  }
});

export default router;
