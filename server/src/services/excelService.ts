import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { WebsiteReport } from '../types/index.js';

export async function createReportsWorkbook(reports: WebsiteReport[], filterMonth?: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Website Maintenance Reporting System';
  workbook.lastModifiedBy = 'DevOps / QA Auditor';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Filter reports if a specific month is requested (e.g. "2026-10")
  let targetReports = reports;
  if (filterMonth && filterMonth.trim().length > 0) {
    targetReports = reports.filter((r) => r.reportDate.startsWith(filterMonth.trim()));
  }

  // Color Definitions
  const navyFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const doneFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFECFDF5' }, // emerald-50
  };
  const doneFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FF065F46' }, // emerald-800
  };

  const undoneFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF2F2' }, // rose-50
  };
  const undoneFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FF991B1B' }, // rose-800
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // ==============================================================
  // SHEET 1: 9-TASK COMPLIANCE MATRIX (PRIMARY SHEET)
  // ==============================================================
  const matrixSheet = workbook.addWorksheet('9-Task Compliance Matrix', {
    views: [{ showGridLines: true }],
  });

  matrixSheet.mergeCells('A1:M1');
  const mTitle = matrixSheet.getCell('A1');
  mTitle.value = 'WORDPRESS MAINTENANCE & SECURITY COMPLIANCE MATRIX';
  mTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  mTitle.fill = navyFill;
  mTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  matrixSheet.getRow(1).height = 32;

  const matrixHeaders = [
    'No.',
    'Website URL',
    '1. Plugin Upgrade',
    '2. Theme Upgrade',
    '3. WP-Config Code',
    '4. PHP Version',
    '5. 2FA Security',
    '6. User Accounts',
    '7. Elastic Email',
    '8. Website QA',
    '9. WordPress Core',
    '10. WP-Hide',
    'Overall %',
  ];

  const mRow = matrixSheet.addRow(matrixHeaders);
  mRow.height = 25;
  mRow.eachCell((cell) => {
    cell.font = headerFont;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  targetReports.forEach((r, idx) => {
    const findTask = (kw: string) => r.tasks.find((t) => t.name.toLowerCase().includes(kw));

    const tPlugin = findTask('plugin');
    const tTheme = findTask('theme');
    const tConfig = findTask('config');
    const tPhp = findTask('php');
    const t2fa = findTask('factor') || findTask('2fa');
    const tUsers = findTask('user');
    const tEmail = findTask('elastic') || findTask('email');
    const tQa = findTask('qa') || findTask('quality');
    const tCore = findTask('core');
    const tHide = findTask('hide');

    const formatCell = (task?: any) => {
      if (!task) return 'N/A';
      if (task.status !== 'Done') {
        return 'UNDONE';
      }
      let extra = '';
      if (task.meta?.phpVersion && String(task.meta.phpVersion).trim()) {
        extra = ` (${String(task.meta.phpVersion).trim()})`;
      } else if (task.meta?.wpVersion && String(task.meta.wpVersion).trim()) {
        extra = ` (${String(task.meta.wpVersion).trim()})`;
      }
      return `DONE${extra}`;
    };

    const row = matrixSheet.addRow([
      idx + 1,
      r.websiteUrl,
      formatCell(tPlugin),
      formatCell(tTheme),
      formatCell(tConfig),
      formatCell(tPhp),
      formatCell(t2fa),
      formatCell(tUsers),
      formatCell(tEmail),
      formatCell(tQa),
      formatCell(tCore),
      formatCell(tHide),
      `${r.completionPercentage}%`,
    ]);
    row.height = 22;

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(13).alignment = { horizontal: 'center' };

    // Format each task cell
    for (let c = 3; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.alignment = { horizontal: 'center' };
      const val = String(cell.value || '');
      if (val.startsWith('DONE')) {
        cell.fill = doneFill;
        cell.font = doneFont;
      } else if (val.startsWith('UNDONE')) {
        cell.fill = undoneFill;
        cell.font = undoneFont;
      }
    }

    // Format Overall %
    const lastCell = row.getCell(13);
    if (r.completionPercentage === 100) {
      lastCell.fill = doneFill;
      lastCell.font = doneFont;
    } else {
      lastCell.fill = undoneFill;
      lastCell.font = undoneFont;
    }

    row.eachCell((cell) => {
      cell.border = thinBorder;
    });
  });

  // Matrix widths
  matrixSheet.getColumn(1).width = 6;
  matrixSheet.getColumn(2).width = 32;
  for (let col = 3; col <= 12; col++) {
    matrixSheet.getColumn(col).width = 20;
  }
  matrixSheet.getColumn(13).width = 14;

  // ==============================================================
  // SHEET 2: DETAILED REPORT LOG
  // ==============================================================
  const detailSheet = workbook.addWorksheet('Detailed Audit Log', {
    views: [{ showGridLines: true }],
  });

  const detailHeaders = [
    'Report ID',
    'Website URL',
    'Website Name',
    'Client Name',
    'Report Date',
    'Completed',
    'Total',
    'Readiness %',
    'Executive Summary',
    'Final Status Summary',
    'Audited WordPress Accounts',
    'Created Timestamp',
  ];

  const dRow = detailSheet.addRow(detailHeaders);
  dRow.height = 24;
  dRow.eachCell((cell) => {
    cell.font = headerFont;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  targetReports.forEach((r) => {
    const userSummary = (r.wordpressUsers || [])
      .map((u) => `${u.username} (${u.role}, 2FA: ${u.twoFactorStatus})`)
      .join('; ');

    const row = detailSheet.addRow([
      r.id,
      r.websiteUrl,
      r.websiteName,
      r.clientName || 'N/A',
      r.reportDate,
      r.completedTasks,
      r.totalTasks,
      `${r.completionPercentage}%`,
      r.executiveSummary,
      r.finalSummary,
      userSummary || 'None recorded',
      r.createdAt,
    ]);
    row.height = 22;

    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };

    row.eachCell((c) => {
      c.border = thinBorder;
    });
  });

  detailSheet.getColumn(1).width = 36;
  detailSheet.getColumn(2).width = 30;
  detailSheet.getColumn(3).width = 24;
  detailSheet.getColumn(4).width = 20;
  detailSheet.getColumn(5).width = 14;
  detailSheet.getColumn(6).width = 12;
  detailSheet.getColumn(7).width = 10;
  detailSheet.getColumn(8).width = 14;
  detailSheet.getColumn(9).width = 45;
  detailSheet.getColumn(10).width = 45;
  detailSheet.getColumn(11).width = 35;
  detailSheet.getColumn(12).width = 24;

  return workbook;
}

// Write master Excel file to disk
export async function syncMasterExcelFile(reports: WebsiteReport[]): Promise<string> {
  const filePath = path.resolve(process.cwd(), 'data', 'monthly-website-reports.xlsx');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workbook = await createReportsWorkbook(reports);
  await workbook.xlsx.writeFile(filePath);
  console.log(`[Excel] Synced master workbook to ${filePath}`);
  return filePath;
}
