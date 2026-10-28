import { MaintenanceTask, TaskStatus } from '../types/index.js';

export function calculateStats(tasks: MaintenanceTask[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const incompleteTasks = totalTasks - completedTasks;
  const completionPercentage =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalTasks,
    completedTasks,
    incompleteTasks,
    completionPercentage,
  };
}

export function generateExecutiveSummary(
  websiteUrl: string,
  reportDate: string,
  tasks: MaintenanceTask[]
): string {
  const domain = websiteUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || websiteUrl;
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Done').length;

  if (total === 0) {
    return `This report was initiated for ${domain} on ${reportDate}. No maintenance checklist items have been configured yet.`;
  }

  const completedTaskNames = tasks
    .filter((t) => t.status === 'Done')
    .map((t) => t.name.toLowerCase());

  let highlights = '';
  if (completed === total) {
    highlights = ' All scheduled maintenance, upgrade, and verification items have been successfully executed.';
  } else if (completed === 0) {
    highlights = ' All scheduled maintenance items are currently pending execution or follow-up.';
  } else {
    const keyDone: string[] = [];
    if (completedTaskNames.some((n) => n.includes('core'))) keyDone.push('WordPress core');
    if (completedTaskNames.some((n) => n.includes('plugin'))) keyDone.push('plugins');
    if (completedTaskNames.some((n) => n.includes('theme'))) keyDone.push('themes');
    if (completedTaskNames.some((n) => n.includes('config') || n.includes('php'))) keyDone.push('server & config');
    if (completedTaskNames.some((n) => n.includes('2fa') || n.includes('factor'))) keyDone.push('two-factor authentication');
    if (completedTaskNames.some((n) => n.includes('hide'))) keyDone.push('WP-Hide security');
    if (completedTaskNames.some((n) => n.includes('qa') || n.includes('quality'))) keyDone.push('quality assurance');

    if (keyDone.length > 0) {
      highlights = ` Completed areas include ${keyDone.join(', ')}. Remaining incomplete items require further action as documented below.`;
    } else {
      highlights = ` ${completed} of ${total} maintenance items have been verified, with the remaining tasks requiring follow-up.`;
    }
  }

  return `This report summarizes the WordPress maintenance, upgrade, security configuration, email delivery, and quality assurance tasks recorded for ${domain} as of ${reportDate}.${highlights}`;
}

export function generateFinalSummary(tasks: MaintenanceTask[]): string {
  const { totalTasks, completedTasks, incompleteTasks, completionPercentage } = calculateStats(tasks);

  if (totalTasks === 0) {
    return 'No maintenance tasks were recorded for this evaluation. Add tasks to produce a complete progress evaluation.';
  }

  const incompleteList = tasks
    .filter((t) => t.status === 'Undone')
    .map((t) => t.name);

  if (completedTasks === totalTasks) {
    return `All ${totalTasks} recorded maintenance tasks for this website are marked as completed, achieving a 100% completion rate. All core, plugin, theme, and security checks have been documented and fulfilled.`;
  }

  if (completedTasks === 0) {
    return `Of the ${totalTasks} maintenance tasks recorded for this website, none (0) are currently marked as completed, and all ${totalTasks} remain incomplete. The overall completion rate is 0%. Immediate attention is required to initiate maintenance actions.`;
  }

  let followUpNote = '';
  if (incompleteList.length > 0 && incompleteList.length <= 4) {
    followUpNote = ` Specific pending items include: ${incompleteList.join(', ')}.`;
  } else if (incompleteList.length > 4) {
    followUpNote = ` The ${incompleteTasks} incomplete tasks are detailed in the checklist below for prioritized resolution.`;
  }

  return `Of the ${totalTasks} maintenance tasks recorded for this website, ${completedTasks} are marked as completed and ${incompleteTasks} remain incomplete. The overall completion rate is ${completionPercentage}%.${followUpNote} The website should not be treated as fully maintained or secure until these outstanding items are addressed.`;
}
