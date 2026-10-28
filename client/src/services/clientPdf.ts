import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WebsiteReport } from '../types';

export function exportReportToPdf(report: WebsiteReport) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900 / dark navy
  doc.rect(margin, 35, contentWidth, 54, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Website Maintenance & Upgrade Report', margin + 14, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL & FACTUAL AUDIT DOCUMENT', margin + 14, 76);

  // Metadata Card
  let currentY = 100;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, contentWidth, 65, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('WEBSITE URL', margin + 12, currentY + 16);
  doc.text('CLIENT NAME', margin + 180, currentY + 16);
  doc.text('REPORT DATE', margin + 350, currentY + 16);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(report.websiteUrl, margin + 12, currentY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(report.clientName || 'N/A', margin + 180, currentY + 30);
  doc.text(report.reportDate, margin + 350, currentY + 30);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('WEBSITE NAME', margin + 12, currentY + 46);
  doc.text('PREPARED BY', margin + 180, currentY + 46);
  doc.text('OVERALL PROGRESS', margin + 350, currentY + 46);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(report.websiteName || 'N/A', margin + 12, currentY + 58);
  doc.text(report.preparedBy || 'Engineering Team', margin + 180, currentY + 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // green
  doc.text(`${report.completionPercentage}% Completed`, margin + 350, currentY + 58);

  currentY += 76;

  // Stats Grid
  const cardW = (contentWidth - 18) / 4;
  const stats = [
    { label: 'TOTAL TASKS', val: String(report.totalTasks), bg: [255, 255, 255], border: [203, 213, 225], text: [30, 41, 59] },
    { label: 'COMPLETED', val: String(report.completedTasks), bg: [236, 253, 245], border: [167, 243, 208], text: [5, 150, 105] },
    { label: 'INCOMPLETE', val: String(report.incompleteTasks), bg: [254, 242, 242], border: [254, 202, 202], text: [220, 38, 38] },
    { label: 'COMPLETION', val: `${report.completionPercentage}%`, bg: [241, 245, 249], border: [203, 213, 225], text: [15, 23, 42] },
  ];

  stats.forEach((s, idx) => {
    const x = margin + idx * (cardW + 6);
    doc.setFillColor(s.bg[0], s.bg[1], s.bg[2]);
    doc.setDrawColor(s.border[0], s.border[1], s.border[2]);
    doc.rect(x, currentY, cardW, 40, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(s.label, x + 8, currentY + 13);

    doc.setFontSize(14);
    doc.setTextColor(s.text[0], s.text[1], s.text[2]);
    doc.text(s.val, x + 8, currentY + 31);
  });

  currentY += 50;

  // Executive Summary Box
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Summary', margin, currentY);
  currentY += 8;

  const splitExec = doc.splitTextToSize(report.executiveSummary, contentWidth - 20);
  const execHeight = Math.max(34, splitExec.length * 12 + 14);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, contentWidth, execHeight, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(splitExec, margin + 10, currentY + 14);

  currentY += execHeight + 16;

  // Detailed Checklist Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Detailed Maintenance Checklist', margin, currentY);
  currentY += 8;

  const taskTableRows = report.tasks.map((task, i) => {
    const parts: string[] = [];
    if (task.meta?.phpVersion && task.meta.phpVersion.trim()) {
      parts.push(`PHP Runtime: ${task.meta.phpVersion.trim()}`);
    }
    if (task.meta?.wpVersion && task.meta.wpVersion.trim()) {
      parts.push(`WordPress Version: ${task.meta.wpVersion.trim()}`);
    }
    if (task.meta?.configChanges && task.meta.configChanges.trim()) {
      parts.push(`Config: ${task.meta.configChanges.trim()}`);
    }
    if (task.notes && task.notes.trim()) {
      parts.push(task.notes.trim());
    }
    const details = parts.length > 0 ? parts.join(' — ') : '-';

    return [
      String(i + 1),
      task.name,
      task.status === 'Done' ? 'DONE' : 'UNDONE',
      details,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['No.', 'Task Name', 'Status', 'Details / Notes']],
    body: taskTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 140, fontStyle: 'bold' },
      2: { cellWidth: 64, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'DONE') {
          data.cell.styles.fillColor = [236, 253, 245];
          data.cell.styles.textColor = [5, 150, 105];
        } else {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // Position after table
  const finalTableY = (doc as any).lastAutoTable.finalY + 16;

  // WordPress Users Table (if any)
  let nextY = finalTableY;
  if (report.wordpressUsers && report.wordpressUsers.length > 0) {
    if (nextY + 120 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      nextY = 40;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('WordPress User Accounts & Security', margin, nextY);
    nextY += 8;

    const userRows = report.wordpressUsers.map((u) => [
      u.username,
      u.email,
      u.role,
      u.twoFactorStatus,
      u.notes || '-',
    ]);

    autoTable(doc, {
      startY: nextY,
      head: [['Username', 'Email Address', 'Role', '2FA Status', 'Notes']],
      body: userRows,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        textColor: [30, 41, 59],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'Enabled') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Disabled') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    nextY = (doc as any).lastAutoTable.finalY + 16;
  }

  // Final Summary Box
  if (nextY + 80 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    nextY = 40;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Final Summary & Status', margin, nextY);
  nextY += 8;

  const splitFinal = doc.splitTextToSize(report.finalSummary, contentWidth - 20);
  const finalHeight = Math.max(34, splitFinal.length * 12 + 14);

  if (report.incompleteTasks > 0) {
    doc.setFillColor(255, 251, 235); // amber-50
    doc.setDrawColor(252, 211, 77); // amber-300
  } else {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(134, 239, 172); // emerald-300
  }
  doc.rect(margin, nextY, contentWidth, finalHeight, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(splitFinal, margin + 10, nextY + 14);

  // Add Page Numbers & Footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageH - 25, pageWidth - margin, pageH - 25);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Website Maintenance Reporting Tool | ${report.websiteUrl}`, margin, pageH - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 50, pageH - 14);
  }

  const safeUrl = report.websiteUrl.replace(/^https?:\/\//i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`report-${safeUrl}-${report.reportDate}.pdf`);
}
