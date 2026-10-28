import PDFDocument from 'pdfkit';
import { WebsiteReport } from '../types/index.js';
import { Writable } from 'stream';

export function generateReportPdf(report: WebsiteReport, outputStream: Writable): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
      });

      doc.pipe(outputStream);

      // Colors
      const primaryNavy = '#0F172A';
      const textGray = '#475569';
      const textDark = '#1E293B';
      const borderGray = '#CBD5E1';
      const bgLight = '#F8FAFC';
      const greenSuccess = '#059669';
      const greenBg = '#ECFDF5';
      const redDanger = '#DC2626';
      const redBg = '#FEF2F2';

      // --- Header Banner ---
      doc.rect(40, 40, 515, 60).fill(primaryNavy);
      doc.fillColor('#FFFFFF')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Website Maintenance & Upgrade Report', 55, 52);

      doc.fillColor('#94A3B8')
        .fontSize(9)
        .font('Helvetica')
        .text('CONFIDENTIAL & FACTUAL CLIENT REPORT', 55, 76);

      doc.y = 115;

      // --- Metadata Grid ---
      const metaLeft = 40;
      const metaWidth = 515;
      doc.rect(metaLeft, doc.y, metaWidth, 68).fillAndStroke(bgLight, borderGray);

      const startY = doc.y + 10;
      doc.fillColor(textGray).fontSize(8).font('Helvetica-Bold');
      doc.text('WEBSITE URL', metaLeft + 15, startY);
      doc.text('CLIENT NAME', metaLeft + 200, startY);
      doc.text('REPORT DATE', metaLeft + 360, startY);

      doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold');
      doc.text(report.websiteUrl, metaLeft + 15, startY + 12, { width: 175, lineBreak: false });
      doc.font('Helvetica').text(report.clientName || 'N/A', metaLeft + 200, startY + 12);
      doc.text(report.reportDate, metaLeft + 360, startY + 12);

      const row2Y = startY + 30;
      doc.fillColor(textGray).fontSize(8).font('Helvetica-Bold');
      doc.text('WEBSITE NAME', metaLeft + 15, row2Y);
      doc.text('PREPARED BY', metaLeft + 200, row2Y);
      doc.text('REPORT ID', metaLeft + 360, row2Y);

      doc.fillColor(textDark).fontSize(9).font('Helvetica');
      doc.text(report.websiteName || 'N/A', metaLeft + 15, row2Y + 12);
      doc.text(report.preparedBy || 'Engineering Team', metaLeft + 200, row2Y + 12);
      doc.text(report.id.substring(0, 16), metaLeft + 360, row2Y + 12);

      doc.y = 195;

      // --- Progress & Statistics Cards ---
      const cardY = doc.y;
      const cardW = 120;
      const cardH = 46;
      const cardGap = (515 - cardW * 4) / 3;

      // Total Tasks
      doc.rect(40, cardY, cardW, cardH).fillAndStroke('#FFFFFF', borderGray);
      doc.fillColor(textGray).fontSize(8).font('Helvetica-Bold').text('TOTAL TASKS', 40 + 10, cardY + 8);
      doc.fillColor(primaryNavy).fontSize(16).font('Helvetica-Bold').text(String(report.totalTasks), 40 + 10, cardY + 22);

      // Completed Tasks
      const c2X = 40 + cardW + cardGap;
      doc.rect(c2X, cardY, cardW, cardH).fillAndStroke(greenBg, '#A7F3D0');
      doc.fillColor(greenSuccess).fontSize(8).font('Helvetica-Bold').text('COMPLETED', c2X + 10, cardY + 8);
      doc.fillColor(greenSuccess).fontSize(16).font('Helvetica-Bold').text(String(report.completedTasks), c2X + 10, cardY + 22);

      // Incomplete Tasks
      const c3X = c2X + cardW + cardGap;
      doc.rect(c3X, cardY, cardW, cardH).fillAndStroke(redBg, '#FECACA');
      doc.fillColor(redDanger).fontSize(8).font('Helvetica-Bold').text('INCOMPLETE', c3X + 10, cardY + 8);
      doc.fillColor(redDanger).fontSize(16).font('Helvetica-Bold').text(String(report.incompleteTasks), c3X + 10, cardY + 22);

      // Completion Percentage
      const c4X = c3X + cardW + cardGap;
      doc.rect(c4X, cardY, cardW, cardH).fillAndStroke('#F1F5F9', '#CBD5E1');
      doc.fillColor(primaryNavy).fontSize(8).font('Helvetica-Bold').text('COMPLETION RATE', c4X + 10, cardY + 8);
      doc.fillColor(primaryNavy).fontSize(16).font('Helvetica-Bold').text(`${report.completionPercentage}%`, c4X + 10, cardY + 22);

      doc.y = cardY + cardH + 16;

      // --- Executive Summary ---
      doc.fillColor(primaryNavy).fontSize(11).font('Helvetica-Bold').text('Executive Summary', 40, doc.y);
      doc.y += 4;
      const execY = doc.y;
      doc.rect(40, execY, 515, 48).fillAndStroke(bgLight, borderGray);
      doc.fillColor(textDark).fontSize(9).font('Helvetica').text(report.executiveSummary, 50, execY + 8, {
        width: 495,
        align: 'left',
        lineGap: 2,
      });

      doc.y = execY + 56;

      // --- Detailed Task Report Table ---
      doc.fillColor(primaryNavy).fontSize(11).font('Helvetica-Bold').text('Detailed Maintenance Checklist', 40, doc.y);
      doc.y += 6;

      // Table Header
      const tableX = 40;
      const colWidths = [30, 160, 65, 260];
      const tableHeaders = ['No.', 'Task Name', 'Status', 'Details / Notes'];

      const renderTableHeader = () => {
        doc.rect(tableX, doc.y, 515, 20).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        let currentX = tableX;
        tableHeaders.forEach((header, i) => {
          doc.text(header, currentX + 6, doc.y + 6, { width: colWidths[i] - 10, align: i === 2 ? 'center' : 'left' });
          currentX += colWidths[i];
        });
        doc.y += 20;
      };

      renderTableHeader();

      report.tasks.forEach((task, index) => {
        // Build details string cleanly
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

        const estimatedHeight = Math.max(22, Math.ceil(details.length / 45) * 11 + 10);

        // Page break check
        if (doc.y + estimatedHeight > 760) {
          doc.addPage();
          renderTableHeader();
        }

        const isEven = index % 2 === 0;
        const rowY = doc.y;
        doc.rect(tableX, rowY, 515, estimatedHeight).fillAndStroke(isEven ? '#FFFFFF' : '#F8FAFC', borderGray);

        // Col 1: Number
        doc.fillColor(textGray).fontSize(8).font('Helvetica').text(String(index + 1), tableX + 6, rowY + 6);

        // Col 2: Task Name
        doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(task.name, tableX + colWidths[0] + 6, rowY + 6, {
          width: colWidths[1] - 12,
        });

        // Col 3: Status Badge
        const badgeX = tableX + colWidths[0] + colWidths[1] + 6;
        const badgeY = rowY + 5;
        const isDone = task.status === 'Done';
        doc.roundedRect(badgeX, badgeY, 52, 14, 3).fill(isDone ? greenBg : redBg);
        doc.fillColor(isDone ? greenSuccess : redDanger)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(isDone ? '✓ Done' : '✕ Undone', badgeX, badgeY + 3.5, { width: 52, align: 'center' });

        // Col 4: Details / Notes
        const detailsX = tableX + colWidths[0] + colWidths[1] + colWidths[2] + 6;
        doc.fillColor(textDark).fontSize(8).font('Helvetica').text(details, detailsX, rowY + 6, {
          width: colWidths[3] - 12,
          lineGap: 2,
        });

        doc.y = rowY + estimatedHeight;
      });

      doc.y += 14;

      // --- WordPress Users Section ---
      if (report.wordpressUsers && report.wordpressUsers.length > 0) {
        if (doc.y + 100 > 760) doc.addPage();

        doc.fillColor(primaryNavy).fontSize(11).font('Helvetica-Bold').text('WordPress User Accounts & Security Roles', 40, doc.y);
        doc.y += 6;

        const userColWidths = [120, 160, 95, 80, 60];
        const userHeaders = ['Username', 'Email Address', 'Role', '2FA Status', 'Notes'];

        const renderUserHeader = () => {
          doc.rect(tableX, doc.y, 515, 18).fill('#334155');
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
          let ux = tableX;
          userHeaders.forEach((h, i) => {
            doc.text(h, ux + 6, doc.y + 5, { width: userColWidths[i] - 10 });
            ux += userColWidths[i];
          });
          doc.y += 18;
        };

        renderUserHeader();

        report.wordpressUsers.forEach((user, idx) => {
          if (doc.y + 24 > 760) {
            doc.addPage();
            renderUserHeader();
          }

          const uRowY = doc.y;
          doc.rect(tableX, uRowY, 515, 20).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC', borderGray);

          let ux = tableX;
          doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(user.username, ux + 6, uRowY + 5, { width: userColWidths[0] - 10 });
          ux += userColWidths[0];

          doc.fillColor(textDark).fontSize(8).font('Helvetica').text(user.email, ux + 6, uRowY + 5, { width: userColWidths[1] - 10 });
          ux += userColWidths[1];

          doc.fillColor(textDark).fontSize(8).font('Helvetica').text(user.role, ux + 6, uRowY + 5, { width: userColWidths[2] - 10 });
          ux += userColWidths[2];

          const is2fa = user.twoFactorStatus === 'Enabled';
          doc.fillColor(is2fa ? greenSuccess : (user.twoFactorStatus === 'Disabled' ? redDanger : textGray))
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(user.twoFactorStatus, ux + 6, uRowY + 5, { width: userColWidths[3] - 10 });
          ux += userColWidths[3];

          doc.fillColor(textGray).fontSize(8).font('Helvetica').text(user.notes || '-', ux + 6, uRowY + 5, { width: userColWidths[4] - 10 });

          doc.y = uRowY + 20;
        });

        doc.y += 14;
      }

      // --- Final Summary Section ---
      if (doc.y + 80 > 760) doc.addPage();

      doc.fillColor(primaryNavy).fontSize(11).font('Helvetica-Bold').text('Final Audit Summary & Recommendations', 40, doc.y);
      doc.y += 6;
      const finY = doc.y;
      doc.rect(40, finY, 515, 50).fillAndStroke(report.incompleteTasks > 0 ? '#FFFBEB' : greenBg, report.incompleteTasks > 0 ? '#FCD34D' : '#86EFAC');
      doc.fillColor(textDark).fontSize(9).font('Helvetica').text(report.finalSummary, 50, finY + 8, {
        width: 495,
        align: 'left',
        lineGap: 2,
      });

      doc.y = finY + 60;

      // --- Page Numbers & Footer on All Pages ---
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.rect(40, 800, 515, 0.5).fill(borderGray);
        doc.fillColor(textGray).fontSize(8).font('Helvetica');
        doc.text(`Generated by Website Maintenance Reporting Tool | ${report.websiteUrl}`, 40, 806);
        doc.text(`Page ${i + 1} of ${totalPages}`, 450, 806, { width: 105, align: 'right' });
      }

      doc.end();
      outputStream.on('finish', () => resolve());
      outputStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
