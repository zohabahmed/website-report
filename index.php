<?php
/**
 * ==============================================================================
 * wds-wp-report - Single-File Cloudways Edition
 * ==============================================================================
 * How to deploy to Cloudways:
 * 1. Upload this file as `index.php` directly into your Cloudways `public_html/` folder.
 * 2. Done! It runs out of the box on any Cloudways PHP stack (PHP 8.0 - 8.4).
 * ==============================================================================
 */

// -----------------------------------------------------------------------------
// GOOGLE SHEETS & LIVE SYNC CONFIGURATION
// -----------------------------------------------------------------------------
$googleSheetUrl = 'https://docs.google.com/spreadsheets/d/14CCuvMZ0L-ue5nTuIfndTPMKo_0Tdn0Fa3PDlQyVLK0/edit?gid=0#gid=0';
$googleWebhookUrl = 'https://script.google.com/macros/s/AKfycbzA8RxyLB0yMUWGjCjbAdK63CN3SNwuH8B-zWR2O6z9VKb2i3duAoNtRE4huVegV8Bu/exec';

// -----------------------------------------------------------------------------
// BACKEND API & DATA PERSISTENCE
// -----------------------------------------------------------------------------
$dataDir = __DIR__ . '/data';
if (!file_exists($dataDir)) {
    @mkdir($dataDir, 0755, true);
}
$dbFile = $dataDir . '/reports.json';

function getReports($dbFile) {
    if (!file_exists($dbFile)) return [];
    $content = file_get_contents($dbFile);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveReports($dbFile, $reports) {
    file_put_contents($dbFile, json_encode($reports, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function pushToGoogleSheet($webhookUrl, $reportData) {
    if (empty($webhookUrl)) {
        return ['success' => false, 'error' => 'Webhook URL not configured'];
    }
    $payload = json_encode($reportData);
    $result = null;
    $httpCode = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($webhookUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $responseBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($responseBody) {
            $decoded = json_decode($responseBody, true);
            $result = $decoded ? $decoded : $responseBody;
        }
    } else {
        $responseBody = @file_get_contents($webhookUrl, false, stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 6,
                'follow_location' => 1
            ]
        ]));
        if ($responseBody) {
            $decoded = json_decode($responseBody, true);
            $result = $decoded ? $decoded : $responseBody;
        }
    }

    $isOk = ($httpCode >= 200 && $httpCode < 400) || (!empty($result['status']) && $result['status'] === 'success');
    return [
        'success' => $isOk,
        'httpCode' => $httpCode,
        'result' => $result
    ];
}

// Handle API requests
if (isset($_GET['api'])) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['api'];
    $reports = getReports($dbFile);

    if ($action === 'get_reports') {
        $search = isset($_GET['search']) ? trim(strtolower($_GET['search'])) : '';
        if ($search !== '') {
            $reports = array_values(array_filter($reports, function($r) use ($search) {
                return (strpos(strtolower($r['websiteUrl']), $search) !== false) ||
                       (isset($r['websiteName']) && strpos(strtolower($r['websiteName']), $search) !== false);
            }));
        }
        echo json_encode(['reports' => $reports]);
        exit;
    }

    if ($action === 'save_report' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['websiteUrl'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Website URL is required']);
            exit;
        }

        $id = !empty($input['id']) && (substr($input['id'], 0, 6) !== 'draft-') ? $input['id'] : uniqid('rep_', true);
        $now = date('c');

        $existingIndex = -1;
        foreach ($reports as $idx => $r) {
            if ($r['id'] === $id) {
                $existingIndex = $idx;
                break;
            }
        }

        if ($existingIndex >= 0) {
            $input['id'] = $id;
            $input['createdAt'] = $reports[$existingIndex]['createdAt'] ?? $now;
            $input['updatedAt'] = $now;
            $reports[$existingIndex] = $input;
        } else {
            $input['id'] = $id;
            $input['createdAt'] = $now;
            $input['updatedAt'] = $now;
            array_unshift($reports, $input);
        }

        saveReports($dbFile, $reports);

        // Push to Google Apps Script Webhook if option selected
        $sheetSync = null;
        if (!isset($input['saveToSheet']) || $input['saveToSheet'] === true) {
            $sheetSync = pushToGoogleSheet($googleWebhookUrl, $input);
        }

        echo json_encode(['report' => $input, 'sheetSync' => $sheetSync]);
        exit;
    }

    if ($action === 'save_to_sheet' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
            exit;
        }

        $sheetResp = pushToGoogleSheet($googleWebhookUrl, $input);
        echo json_encode([
            'success' => $sheetResp['success'],
            'sheetResp' => $sheetResp,
            'sheetUrl' => $googleSheetUrl
        ]);
        exit;
    }

    if ($action === 'duplicate_report' && isset($_GET['id'])) {
        $targetId = $_GET['id'];
        $found = null;
        foreach ($reports as $r) {
            if ($r['id'] === $targetId) {
                $found = $r;
                break;
            }
        }
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Report not found']);
            exit;
        }

        $now = date('c');
        $copy = $found;
        $copy['id'] = uniqid('rep_', true);
        $copy['websiteName'] = ($found['websiteName'] ?? 'Site') . ' (Copy)';
        $copy['reportDate'] = date('Y-m-d');
        $copy['createdAt'] = $now;
        $copy['updatedAt'] = $now;
        array_unshift($reports, $copy);
        saveReports($dbFile, $reports);
        echo json_encode(['report' => $copy]);
        exit;
    }

    if ($action === 'delete_report' && isset($_GET['id'])) {
        $targetId = $_GET['id'];
        $reports = array_values(array_filter($reports, function($r) use ($targetId) {
            return $r['id'] !== $targetId;
        }));
        saveReports($dbFile, $reports);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'clear_all_reports') {
        saveReports($dbFile, []);
        echo json_encode(['success' => true, 'message' => 'All saved reports have been reset.']);
        exit;
    }

    if ($action === 'export_excel') {
        $singleId = isset($_GET['id']) ? trim($_GET['id']) : '';
        $exportReports = $reports;
        $filename = 'monthly-website-maintenance-' . date('Y-m') . '.csv';

        if ($singleId !== '') {
            $filtered = array_values(array_filter($reports, function($r) use ($singleId) {
                return ($r['id'] ?? '') === $singleId;
            }));
            if (!empty($filtered)) {
                $exportReports = $filtered;
                $host = parse_url($filtered[0]['websiteUrl'] ?? '', PHP_URL_HOST);
                if (!$host) $host = preg_replace('#^https?://#i', '', $filtered[0]['websiteUrl'] ?? 'report');
                $cleanHost = preg_replace('/[^a-zA-Z0-9]/', '_', $host);
                $filename = 'maintenance-report-' . $cleanHost . '-' . ($filtered[0]['reportDate'] ?? date('Y-m-d')) . '.csv';
            }
        }

        // Generate Excel-compatible spreadsheet with UTF-8 BOM
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM for Microsoft Excel auto-detection
        fputs($out, "\xEF\xBB\xBF");

        // Headers
        fputcsv($out, [
            'No.',
            'Website URL',
            'Website Name',
            'Report Date',
            'Completed Tasks',
            'Total Tasks',
            'Readiness %',
            'Plugins Upgrade',
            'Themes Upgrade',
            'Disable File Edit',
            'PHP Version',
            'WordPress Core Upgrade',
            'Two-Factor Auth (2FA)',
            'User Accounts & Emails',
            'Elastic Email',
            'WP-Hide',
            'Inactivity Session Logout',
            'Elementor License',
            'Honey Pot',
            'Google reCAPTCHA',
            'Website QA',
            'Executive Summary',
            'Final Summary',
            'Last Updated'
        ]);

        foreach ($exportReports as $idx => $r) {
            $findTask = function($keyword) use ($r) {
                if (empty($r['tasks']) || !is_array($r['tasks'])) return 'N/A';
                foreach ($r['tasks'] as $t) {
                    if (stripos($t['name'], $keyword) !== false) {
                        $isDone = ($t['status'] ?? 'Undone') === 'Done';
                        if (!$isDone) {
                            return 'UNDONE';
                        }
                        $extra = '';
                        if (!empty($t['meta']['phpVersion']) && trim($t['meta']['phpVersion']) !== '') {
                            $extra .= ' (' . trim($t['meta']['phpVersion']) . ')';
                        }
                        if (!empty($t['meta']['wpVersion']) && trim($t['meta']['wpVersion']) !== '') {
                            $extra .= ' (' . trim($t['meta']['wpVersion']) . ')';
                        }
                        if (!empty($t['notes']) && trim($t['notes']) !== '') {
                            $extra .= ' - ' . trim($t['notes']);
                        }
                        return 'DONE' . $extra;
                    }
                }
                return 'N/A';
            };

            fputcsv($out, [
                $idx + 1,
                $r['websiteUrl'] ?? '',
                $r['websiteName'] ?? '',
                $r['reportDate'] ?? '',
                $r['completedTasks'] ?? 0,
                $r['totalTasks'] ?? 0,
                ($r['completionPercentage'] ?? 0) . '%',
                $findTask('plugin'),
                $findTask('theme'),
                $findTask('file edit') !== 'N/A' ? $findTask('file edit') : $findTask('config'),
                $findTask('php'),
                $findTask('core'),
                $findTask('2fa') !== 'N/A' ? $findTask('2fa') : $findTask('factor'),
                $findTask('user'),
                $findTask('elastic'),
                $findTask('hide'),
                $findTask('logout') !== 'N/A' ? $findTask('logout') : $findTask('session'),
                $findTask('elementor'),
                $findTask('honey'),
                $findTask('recaptcha'),
                $findTask('qa'),
                $r['executiveSummary'] ?? '',
                $r['finalSummary'] ?? '',
                $r['updatedAt'] ?? ''
            ]);
        }
        fclose($out);
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>wds-wp-report</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563EB'><path d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z'/></svg>">
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Vue 3 Standalone CDN -->
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  
  <!-- jsPDF & AutoTable for client-side PDF export -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>

  <style>
    @media print {
      body { background: #ffffff !important; color: #000000 !important; }
      .no-print { display: none !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-black selection:text-white">

<div id="app" v-cloak>
  <!-- TOP NAVIGATION BAR -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs no-print">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div @click="activeTab = 'create'" class="flex items-center gap-2.5 sm:gap-3 cursor-pointer group">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black flex items-center justify-center text-white shadow-sm group-hover:bg-slate-800 transition-colors flex-shrink-0">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div>
          <span class="font-extrabold text-sm sm:text-base tracking-tight text-slate-950 block leading-tight">
            wds-wp-report
          </span>
          <span class="text-[9px] sm:text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            WordPress Upgrade & QA Reporter
          </span>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
    
    <!-- ============================================================== -->
    <!-- 1. STREAMLINED REPORT CREATOR VIEW -->
    <!-- ============================================================== -->
    <div v-if="activeTab === 'create'" class="space-y-4 sm:space-y-6">
      <!-- TOP FIELD: WEBSITE URL -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-xs">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
            Website URL
          </span>
          <span class="text-[11px] text-slate-500 font-semibold lowercase">required</span>
        </label>

        <input
          type="text"
          v-model="websiteUrl"
          @input="urlError = ''"
          placeholder="Enter website URL (e.g. example.com or https://mywebsite.com)"
          class="w-full text-sm sm:text-base md:text-lg font-semibold px-3.5 sm:px-4 py-3 sm:py-3.5 bg-slate-50 text-slate-900 border rounded-xl outline-none transition-all placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10"
          :class="urlError ? 'border-rose-500' : 'border-slate-300'"
          autofocus
        />

        <p v-if="urlError" class="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          {{ urlError }}
        </p>

        <!-- Progress Tracker Bar -->
        <div class="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1 text-xs">
          <span class="text-slate-600">Progress: <strong class="text-slate-950">{{ completedCount }} of {{ tasks.length }} Completed</strong></span>
          <span class="font-bold" :class="percentage === 100 ? 'text-emerald-700' : (percentage > 0 ? 'text-black' : 'text-slate-400')">
            {{ percentage }}% Done
          </span>
        </div>
        <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
          <div class="h-2 transition-all duration-300" :style="{ width: percentage + '%' }" :class="percentage === 100 ? 'bg-emerald-600' : 'bg-black'"></div>
        </div>
      </div>

      <!-- 2. CHECKLIST OF 10 MAINTENANCE TASKS -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-800">
            Maintenance Tasks (Mark Done or Undone)
          </h2>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="markAllTasks('Done')"
              class="text-xs text-slate-500 hover:text-black font-semibold underline cursor-pointer"
            >
              Mark All Done
            </button>
            <span class="text-slate-300">|</span>
            <button
              type="button"
              @click="markAllTasks('Undone')"
              class="text-xs text-slate-500 hover:text-black font-semibold underline cursor-pointer"
            >
              Mark All Undone
            </button>
          </div>
        </div>

        <div class="divide-y divide-slate-200">
          <div
            v-for="(task, idx) in tasks"
            :key="task.id"
            class="transition-colors"
            :class="task.status === 'Done' ? 'bg-white hover:bg-slate-50/70' : 'bg-white hover:bg-slate-50/50'"
          >
            <div class="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <!-- Title & Index -->
              <div class="flex-1 min-w-0 w-full sm:w-auto">
                <div class="flex items-start sm:items-center gap-2.5 sm:gap-3">
                  <span class="text-xs font-bold text-slate-400 w-5 flex-shrink-0 pt-0.5 sm:pt-0">{{ idx + 1 }}.</span>
                  <span class="text-sm sm:text-base font-semibold text-slate-900 break-words leading-snug">{{ task.name }}</span>
                </div>

                <!-- PHP Version Text Input (User types the version) -->
                <div v-if="task.id === 'task-php-version'" class="flex items-center gap-2 mt-2 ml-0 sm:ml-7 w-full sm:w-auto">
                  <input
                    type="text"
                    v-model="task.meta.phpVersion"
                    placeholder="Enter PHP version (optional)"
                    class="text-xs px-3 py-1.5 bg-slate-50 text-slate-900 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black w-full max-w-[260px] sm:w-60 placeholder:text-slate-400"
                  />
                  <button v-if="task.meta.phpVersion" @click="task.meta.phpVersion = ''" class="text-[11px] text-slate-400 hover:text-rose-600 flex-shrink-0">Clear</button>
                </div>

                <!-- WordPress Core Version Text Input (User types the version) -->
                <div v-if="task.id === 'task-wp-core'" class="flex items-center gap-2 mt-2 ml-0 sm:ml-7 w-full sm:w-auto">
                  <input
                    type="text"
                    v-model="task.meta.wpVersion"
                    placeholder="Enter WordPress core version (optional)"
                    class="text-xs px-3 py-1.5 bg-slate-50 text-slate-900 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black w-full max-w-[260px] sm:w-60 placeholder:text-slate-400"
                  />
                  <button v-if="task.meta.wpVersion" @click="task.meta.wpVersion = ''" class="text-[11px] text-slate-400 hover:text-rose-600 flex-shrink-0">Clear</button>
                </div>

                <!-- Notes summary if closed -->
                <div v-if="task.notes && !expandedNotes[task.id]" class="text-xs text-slate-600 truncate mt-1 ml-0 sm:ml-7">
                  {{ task.notes }}
                </div>
              </div>

              <!-- Action Controls: Note + DONE / UNDONE Toggle + REMOVE -->
              <div class="flex items-center justify-end sm:justify-start gap-2 flex-shrink-0 self-end sm:self-center">
                <button
                  v-if="task.id !== 'task-php-version' && task.id !== 'task-wp-core'"
                  type="button"
                  @click="expandedNotes[task.id] = !expandedNotes[task.id]"
                  :class="task.notes ? 'bg-slate-100 text-slate-900 border-slate-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-900'"
                  class="text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {{ task.notes ? task.notes : '+ Config' }}
                </button>

                <button
                  type="button"
                  @click="task.status = (task.status === 'Done' ? 'Undone' : 'Done')"
                  :class="task.status === 'Done' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs' : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs'"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer"
                >
                  <span v-if="task.status === 'Done'">✓ Done</span>
                  <span v-else>✕ Undone</span>
                </button>

                <button
                  type="button"
                  @click="removeTask(task.id)"
                  title="Remove this task/field"
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>

            <!-- Expandable Note Drawer -->
            <div v-if="expandedNotes[task.id]" class="px-6 pb-4 pt-2 bg-slate-50 border-t border-slate-200 space-y-2">
              <input
                type="text"
                v-model="task.notes"
                :placeholder="'Add specific observations or notes for ' + task.name + '...'"
                class="w-full text-xs px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-black"
              />
              
              <!-- Quick tags for WP-Config -->
              <div v-if="task.id === 'task-wp-config'" class="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-600">
                <span>Quick Tags:</span>
                <button
                  v-for="tag in ['DISALLOW_FILE_EDIT enabled', 'WP_DEBUG disabled', 'Security Keys Rotated', 'Table Prefix Secured']"
                  :key="tag"
                  type="button"
                  @click="task.notes = task.notes ? (task.notes + ', ' + tag) : tag"
                  class="px-2.5 py-1 rounded bg-white text-slate-700 hover:text-black hover:bg-slate-100 border border-slate-300 text-[11px]"
                >
                  + {{ tag }}
                </button>
              </div>

              <!-- Quick tags for User Accounts -->
              <div v-if="task.id === 'task-user-accounts'" class="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-600">
                <span>Quick Tags:</span>
                <button
                  v-for="tag in ['Admin 2FA Enforced', 'Inactive Users Cleared', 'Roles Audited', 'No Default Admin Username']"
                  :key="tag"
                  type="button"
                  @click="task.notes = task.notes ? (task.notes + ', ' + tag) : tag"
                  class="px-2.5 py-1 rounded bg-white text-slate-700 hover:text-black hover:bg-slate-100 border border-slate-300 text-[11px]"
                >
                  + {{ tag }}
                </button>
              </div>

              <!-- Quick tags for Elastic Email -->
              <div v-if="task.id === 'task-elastic-email'" class="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-600">
                <span>Quick Tags:</span>
                <button
                  v-for="tag in ['SMTP Handshake Verified', 'SPF & DKIM Validated', 'Test Email Delivered 100%', 'TLS 1.3 Active']"
                  :key="tag"
                  type="button"
                  @click="task.notes = task.notes ? (task.notes + ', ' + tag) : tag"
                  class="px-2.5 py-1 rounded bg-white text-slate-700 hover:text-black hover:bg-slate-100 border border-slate-300 text-[11px]"
                >
                  + {{ tag }}
                </button>
              </div>

              <!-- Quick tags for QA -->
              <div v-if="task.id === 'task-qa'" class="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-600">
                <span>Quick Tags:</span>
                <button
                  v-for="tag in ['Forms & Submissions Tested', 'Mobile Responsive OK', 'SSL / HTTPS Validated', 'Console Errors: 0', 'Checkout Verified']"
                  :key="tag"
                  type="button"
                  @click="task.notes = task.notes ? (task.notes + ', ' + tag) : tag"
                  class="px-2.5 py-1 rounded bg-white text-slate-700 hover:text-black hover:bg-slate-100 border border-slate-300 text-[11px]"
                >
                  + {{ tag }}
                </button>
              </div>

              <!-- Quick tags for WP-Hide -->
              <div v-if="task.id === 'task-wp-hide'" class="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-600">
                <span>Quick Tags:</span>
                <button
                  v-for="tag in ['Login URL Obfuscated', 'wp-content/plugins Masked', 'XML-RPC Blocked', 'Core Footprints Hidden']"
                  :key="tag"
                  type="button"
                  @click="task.notes = task.notes ? (task.notes + ', ' + tag) : tag"
                  class="px-2.5 py-1 rounded bg-white text-slate-700 hover:text-black hover:bg-slate-100 border border-slate-300 text-[11px]"
                >
                  + {{ tag }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="addCustomTask"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:text-black text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Custom Task
            </button>
            <button
              type="button"
              @click="resetDefaultTasks"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Restore all default maintenance tasks"
            >
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Restore Defaults
            </button>
          </div>
          <span class="text-xs text-slate-400 font-medium">{{ tasks.length }} Tasks Active</span>
        </div>
      </div>

      <!-- 3. CREATE REPORT BUTTON AT BOTTOM -->
      <div class="space-y-3">
        <!-- Save to Sheet Option Toggle -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="autoSaveToSheet"
              class="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
            />
            <div>
              <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Save to Google Sheet</span>
                <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">Live Sync</span>
              </div>
              <p class="text-xs text-slate-500">
                Automatically logs this audit as a new row in your connected Google Sheet.
              </p>
            </div>
          </label>
        </div>

        <button
          type="button"
          @click="generateReport"
          class="w-full py-4 px-6 rounded-2xl bg-black hover:bg-slate-800 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-black/10 transition-all hover:scale-[1.005] flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span v-if="autoSaveToSheet">Create Report & Save to Sheet</span>
          <span v-else>Create Website Maintenance Report</span>
        </button>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- 2. REPORT PREVIEW VIEW -->
    <!-- ============================================================== -->
    <div v-if="activeTab === 'preview' && currentReport" class="space-y-6">
      <!-- Action Toolbar -->
      <div class="no-print bg-white border border-slate-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-900 text-sm">Report Preview:</span>
          <span class="text-slate-600 text-xs font-mono font-semibold">{{ currentReport.websiteUrl }}</span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button @click="activeTab = 'create'" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800">
            ← Edit Tasks
          </button>

          <!-- Explicit Save to Sheet Button with loading & status -->
          <button
            @click="saveToGoogleSheet(currentReport)"
            :disabled="sheetSyncing"
            class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Push this report directly to your connected Google Sheet"
          >
            <svg v-if="sheetSyncing" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
            </svg>
            <span v-if="sheetSyncing">Saving to Sheet...</span>
            <span v-else-if="currentReportSavedToSheet">✓ Saved to Sheet</span>
            <span v-else>Save to Sheet</span>
          </button>

          <button @click="downloadPdf" class="px-3.5 py-1.5 rounded-lg bg-black hover:bg-slate-800 text-white text-xs font-bold shadow-xs">
            Download PDF
          </button>
          <a :href="'?api=export_excel&id=' + currentReport.id" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs">
            Export CSV
          </a>
          <button @click="window.print()" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800">
            Print
          </button>
          <button @click="copyReportText" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800">
            Copy Text
          </button>
          <button @click="startNewReport" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold">
            + New
          </button>
        </div>
      </div>

      <!-- Sheet Sync Success / Notification Banner -->
      <div v-if="sheetSyncNotice" class="no-print bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 flex items-center justify-between text-xs font-medium">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>{{ sheetSyncNotice }}</span>
        </div>
        <button @click="sheetSyncNotice = ''" class="text-emerald-600 hover:text-emerald-900 font-bold ml-2">✕</button>
      </div>

      <!-- Printable Report Document Sheet -->
      <div class="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-8 md:p-10 space-y-4 sm:space-y-6 print:p-0 print:border-none print:shadow-none">
        <!-- Header -->
        <div class="bg-black text-white p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div class="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
              Technical Audit & Status Log
            </div>
            <h1 class="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Website Maintenance & Upgrade Report
            </h1>
            <p class="text-xs text-slate-300 mt-1 break-all">
              Target Property: <span class="font-bold text-white">{{ currentReport.websiteUrl }}</span>
            </p>
          </div>
          <div class="bg-slate-900 border border-slate-800 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg text-left sm:text-right flex-shrink-0 self-start sm:self-auto">
            <span class="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Report Date</span>
            <span class="text-sm sm:text-base font-bold text-white">{{ currentReport.reportDate }}</span>
          </div>
        </div>

        <!-- Metric Summary -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5">
            <span class="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-500 block">Total Tasks</span>
            <span class="text-xl sm:text-2xl font-extrabold text-slate-900 block mt-0.5">{{ currentReport.totalTasks }}</span>
          </div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-3.5">
            <span class="text-[10px] sm:text-[11px] font-semibold uppercase text-emerald-800 block">Completed</span>
            <span class="text-xl sm:text-2xl font-extrabold text-emerald-700 block mt-0.5">{{ currentReport.completedTasks }}</span>
          </div>
          <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 sm:p-3.5">
            <span class="text-[10px] sm:text-[11px] font-semibold uppercase text-rose-800 block">Incomplete</span>
            <span class="text-xl sm:text-2xl font-extrabold text-rose-700 block mt-0.5">{{ currentReport.incompleteTasks }}</span>
          </div>
          <div class="bg-slate-100 border border-slate-300 rounded-xl p-3 sm:p-3.5">
            <span class="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-800 block">Readiness</span>
            <span class="text-xl sm:text-2xl font-extrabold text-slate-900 block mt-0.5">{{ currentReport.completionPercentage }}%</span>
          </div>
        </div>

        <!-- Executive Summary -->
        <div class="space-y-2">
          <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide">Executive Summary</h2>
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            {{ currentReport.executiveSummary }}
          </div>
        </div>

        <!-- Detailed Checklist Table -->
        <div class="space-y-2">
          <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide">Detailed Maintenance Checklist</h2>
          <div class="border border-slate-200 rounded-xl overflow-x-auto">
            <table class="w-full min-w-[560px] text-left text-xs">
              <thead class="bg-black text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th class="py-3 px-3 w-12 text-center">No.</th>
                  <th class="py-3 px-4 w-56">Task Name</th>
                  <th class="py-3 px-3 w-24 text-center">Status</th>
                  <th class="py-3 px-4">Configuration / Notes / Version</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="(task, idx) in currentReport.tasks" :key="task.id" :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'">
                  <td class="py-3 px-3 text-center text-slate-400 font-semibold">{{ idx + 1 }}</td>
                  <td class="py-3 px-4 font-bold text-slate-800">{{ task.name }}</td>
                  <td class="py-3 px-3 text-center">
                    <span v-if="task.status === 'Done'" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Done
                    </span>
                    <span v-else class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      ✕ Undone
                    </span>
                  </td>
                  <td class="py-3 px-4 text-slate-700 leading-relaxed">
                    {{ formatTaskDetails(task) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- 3. SAVED REPORTS HISTORY VIEW -->
    <!-- ============================================================== -->
    <div v-if="activeTab === 'history'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Saved Maintenance Reports</h1>
          <p class="text-xs text-slate-500">Recorded website audits on this server</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="syncAllToSheet"
            :disabled="syncingAll || savedReports.length === 0"
            title="Push all saved reports into your connected Google Sheet"
            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white border border-emerald-500 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
            </svg>
            <span v-if="syncingAll">Syncing ({{ syncProgress }})...</span>
            <span v-else>Sync All to Sheet</span>
          </button>
          <button @click="copySheetFormula" title="Copy automatic sync formula for Google Sheets" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer">
            📋 Copy Sync Formula
          </button>
          <a
            href="https://docs.google.com/spreadsheets/d/14CCuvMZ0L-ue5nTuIfndTPMKo_0Tdn0Fa3PDlQyVLK0/edit?gid=0#gid=0"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5 text-emerald-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
            </svg>
            Open Google Sheet ↗
          </a>
          <a href="?api=export_excel" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5">
            Download Master Excel
          </a>
          <button @click="startNewReport" class="px-3.5 py-2 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors">
            + New Report
          </button>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div v-if="savedReports.length === 0" class="py-16 text-center text-slate-500 text-xs">
          No website maintenance reports recorded yet.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th class="py-3 px-4">Website URL</th>
                <th class="py-3 px-3">Date</th>
                <th class="py-3 px-4 w-44">Progress</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="rep in savedReports" :key="rep.id" class="hover:bg-slate-50/80">
                <td class="py-3.5 px-4 font-bold text-slate-900 cursor-pointer hover:text-blue-600" @click="viewReport(rep)">
                  {{ rep.websiteUrl }}
                </td>
                <td class="py-3.5 px-3 text-slate-500 font-mono">{{ rep.reportDate }}</td>
                <td class="py-3.5 px-4">
                  <div class="flex items-center justify-between text-[11px] mb-1">
                    <span class="text-slate-700 font-semibold">{{ rep.completedTasks }}/{{ rep.totalTasks }} Done</span>
                    <span :class="rep.completionPercentage === 100 ? 'text-emerald-700' : 'text-slate-900'" class="font-bold">{{ rep.completionPercentage }}%</span>
                  </div>
                  <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div class="h-1.5 bg-black" :style="{ width: rep.completionPercentage + '%' }"></div>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      @click="saveToGoogleSheet(rep)"
                      :disabled="sheetSyncingId === rep.id"
                      title="Save this report to Google Sheet"
                      class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <svg class="w-3 h-3 text-emerald-700" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                      </svg>
                      <span v-if="sheetSyncingId === rep.id">Saving...</span>
                      <span v-else>Save to Sheet</span>
                    </button>
                    <button @click="viewReport(rep)" class="p-1.5 text-slate-600 hover:text-black font-semibold rounded">View</button>
                    <button @click="editReport(rep)" class="p-1.5 text-slate-600 hover:text-black font-semibold rounded">Edit</button>
                    <button @click="duplicateReport(rep.id)" class="p-1.5 text-slate-600 hover:text-black font-semibold rounded">Duplicate</button>
                    <button @click="deleteReport(rep.id)" class="p-1.5 text-rose-600 hover:text-rose-800 font-semibold rounded">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </main>
</div>

<script>
const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    const activeTab = ref('create');
    const websiteUrl = ref('');
    const urlError = ref('');
    const expandedNotes = ref({});
    const savedReports = ref([]);
    const currentReport = ref(null);
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/14CCuvMZ0L-ue5nTuIfndTPMKo_0Tdn0Fa3PDlQyVLK0/edit?gid=0#gid=0';
    const autoSaveToSheet = ref(true);
    const sheetSyncing = ref(false);
    const sheetSyncingId = ref(null);
    const currentReportSavedToSheet = ref(false);
    const sheetSyncNotice = ref('');
    const syncingAll = ref(false);
    const syncProgress = ref('');

    // Standard Default Tasks with configured notes (Website QA moved to the last, default Undone)
    const getDefaultTasks = () => [
      { id: 'task-plugin-upgrade', name: 'Plugins Upgrade', status: 'Undone', notes: 'upgraded', meta: {} },
      { id: 'task-theme-upgrade', name: 'Themes Upgrade', status: 'Undone', notes: 'upgraded', meta: {} },
      { id: 'task-disable-file-edit', name: 'Disable File Edit', status: 'Undone', notes: 'enabled', meta: {} },
      { id: 'task-php-version', name: 'PHP Version', status: 'Undone', notes: '', meta: { phpVersion: '' } },
      { id: 'task-wp-core', name: 'WordPress Core Upgrade', status: 'Undone', notes: '', meta: { wpVersion: '' } },
      { id: 'task-2fa', name: 'Two-Factor Authentication (2FA)', status: 'Undone', notes: 'Reviewed', meta: {} },
      { id: 'task-user-accounts', name: 'User Accounts and Email Addresses', status: 'Undone', notes: 'Reviewed', meta: {} },
      { id: 'task-elastic-email', name: 'Elastic Email', status: 'Undone', notes: 'configured', meta: {} },
      { id: 'task-wp-hide', name: 'WP-Hide', status: 'Undone', notes: 'enabled', meta: {} },
      { id: 'task-session-logout', name: 'Inactivity Session Logout', status: 'Undone', notes: 'enabled', meta: {} },
      { id: 'task-elementor-license', name: 'Elementor License', status: 'Undone', notes: 'activated', meta: {} },
      { id: 'task-honey-pot', name: 'Honey Pot', status: 'Undone', notes: 'added', meta: {} },
      { id: 'task-recaptcha', name: 'Google reCAPTCHA', status: 'Undone', notes: 'added', meta: {} },
      { id: 'task-qa', name: 'Website QA (Quality Assurance)', status: 'Undone', notes: 'Tested & Verified', meta: {} },
    ];

    const tasks = ref(getDefaultTasks());

    const completedCount = computed(() => tasks.value.filter(t => t.status === 'Done').length);
    const percentage = computed(() => {
      const total = tasks.value.length;
      return total === 0 ? 0 : Math.round((completedCount.value / total) * 100);
    });

    const formatTaskDetails = (task) => {
      const parts = [];
      if (task.meta?.phpVersion?.trim()) parts.push(task.meta.phpVersion.trim());
      if (task.meta?.wpVersion?.trim()) parts.push('v' + task.meta.wpVersion.trim().replace(/^v/i, ''));
      if (task.meta?.configChanges?.trim()) parts.push(task.meta.configChanges.trim());
      if (task.notes?.trim()) parts.push(task.notes.trim());
      return parts.length > 0 ? parts.join(' — ') : '-';
    };

    const removeTask = (id) => {
      tasks.value = tasks.value.filter(t => t.id !== id);
    };

    const resetDefaultTasks = () => {
      tasks.value = getDefaultTasks();
    };

    const markAllTasks = (targetStatus) => {
      tasks.value.forEach(t => {
        t.status = targetStatus;
      });
    };

    const addCustomTask = () => {
      const name = prompt('Enter custom task name:');
      if (name && name.trim()) {
        tasks.value.push({
          id: 'custom-' + Math.random().toString(36).substring(2, 9),
          name: name.trim(),
          status: 'Undone',
          notes: 'configured',
          meta: {}
        });
      }
    };

    const fetchReports = async () => {
      try {
        const res = await fetch('?api=get_reports');
        const data = await res.json();
        savedReports.value = data.reports || [];
      } catch (e) {
        console.error(e);
      }
    };

    const generateReport = async () => {
      if (!websiteUrl.value.trim()) {
        urlError.value = 'Please enter a website URL.';
        return;
      }
      urlError.value = '';

      let cleanUrl = websiteUrl.value.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const total = tasks.value.length;
      const done = completedCount.value;
      const undone = total - done;
      const pct = percentage.value;
      const date = new Date().toISOString().split('T')[0];

      // Dynamic Executive Summary
      let exec = `This report summarizes the WordPress maintenance, upgrade, security configuration, email delivery, and quality assurance tasks recorded for ${cleanUrl} as of ${date}.`;
      if (done === total) {
        exec += ' All scheduled maintenance items have been successfully executed.';
      } else {
        exec += ` ${done} of ${total} tasks have been completed, with ${undone} pending action items detailed below.`;
      }

      // Dynamic Final Summary
      let fin = `Of the ${total} maintenance tasks recorded for this website, ${done} are marked as completed and ${undone} remain incomplete. The overall completion rate is ${pct}%.`;
      if (undone > 0) {
        fin += ' The website should not be treated as fully maintained or secure until these outstanding items are addressed.';
      }

      const reportObj = {
        id: 'rep_' + Math.random().toString(36).substring(2, 9),
        websiteUrl: cleanUrl,
        websiteName: cleanUrl.replace(/^https?:\/\//i, '').split('/')[0],
        reportDate: date,
        totalTasks: total,
        completedTasks: done,
        incompleteTasks: undone,
        completionPercentage: pct,
        tasks: JSON.parse(JSON.stringify(tasks.value)),
        executiveSummary: exec,
        finalSummary: fin
      };

      currentReport.value = reportObj;
      currentReportSavedToSheet.value = false;
      sheetSyncNotice.value = '';
      activeTab.value = 'preview';

      // Auto save to database & Google Sheet if option selected
      try {
        const payload = Object.assign({}, reportObj, { saveToSheet: autoSaveToSheet.value });
        const res = await fetch('?api=save_report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const savedData = await res.json();
        if (autoSaveToSheet.value) {
          currentReportSavedToSheet.value = true;
          const rowInfo = savedData.sheetSync?.result?.row ? ` (Row #${savedData.sheetSync.result.row})` : '';
          sheetSyncNotice.value = `✓ Report for ${cleanUrl} saved to Google Sheet${rowInfo}!`;
        }
      } catch (err) {
        console.warn('Auto save error:', err);
      }
    };

    const saveToGoogleSheet = async (report) => {
      if (!report) return;
      sheetSyncing.value = true;
      sheetSyncingId.value = report.id;
      sheetSyncNotice.value = '';
      try {
        const res = await fetch('?api=save_to_sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        const data = await res.json();
        if (data.success) {
          currentReportSavedToSheet.value = true;
          const rowInfo = data.sheetResp?.result?.row ? ` (Row #${data.sheetResp.result.row})` : '';
          sheetSyncNotice.value = `✓ Report for ${report.websiteUrl} successfully saved to Google Sheet${rowInfo}!`;
        } else {
          alert('Could not save to Google Sheet: ' + (data.sheetResp?.error || data.error || 'Check deployment'));
        }
      } catch (err) {
        console.error('Save to sheet error:', err);
        alert('Failed to connect to Google Sheet. Please check your internet connection.');
      } finally {
        sheetSyncing.value = false;
        sheetSyncingId.value = null;
      }
    };

    const syncAllToSheet = async () => {
      if (savedReports.value.length === 0) {
        alert('No saved reports to sync.');
        return;
      }
      if (!confirm(`Sync all ${savedReports.value.length} saved reports to Google Sheet?`)) return;

      syncingAll.value = true;
      let count = 0;
      for (const rep of savedReports.value) {
        count++;
        syncProgress.value = `${count}/${savedReports.value.length}`;
        try {
          await fetch('?api=save_to_sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rep)
          });
        } catch (e) {
          console.warn('Sync failed for', rep.id, e);
        }
      }
      syncingAll.value = false;
      syncProgress.value = '';
      alert(`Successfully synced ${count} reports to your Google Sheet!`);
    };

    const startNewReport = () => {
      websiteUrl.value = '';
      currentReportSavedToSheet.value = false;
      sheetSyncNotice.value = '';
      tasks.value = getDefaultTasks();
      activeTab.value = 'create';
    };

    const viewReport = (rep) => {
      currentReport.value = rep;
      currentReportSavedToSheet.value = false;
      sheetSyncNotice.value = '';
      activeTab.value = 'preview';
    };

    const editReport = (rep) => {
      websiteUrl.value = rep.websiteUrl;
      tasks.value = JSON.parse(JSON.stringify(rep.tasks));
      activeTab.value = 'create';
    };

    const duplicateReport = async (id) => {
      await fetch('?api=duplicate_report&id=' + id);
      await fetchReports();
    };

    const deleteReport = async (id) => {
      if (confirm('Delete this report permanently?')) {
        await fetch('?api=delete_report&id=' + id);
        await fetchReports();
      }
    };

    const copySheetFormula = () => {
      const url = window.location.origin + window.location.pathname + '?api=export_excel';
      const formula = `=IMPORTDATA("${url}")`;
      navigator.clipboard.writeText(formula);
      alert('Copied formula to clipboard:\n\n' + formula + '\n\nPaste this formula in Cell A1 of your Google Sheet to automatically sync all monthly maintenance reports live!');
    };

    const copyReportText = async () => {
      const r = currentReport.value;
      let txt = `WEBSITE MAINTENANCE REPORT: ${r.websiteUrl}\nDate: ${r.reportDate}\nProgress: ${r.completionPercentage}%\n\n`;
      txt += `EXECUTIVE SUMMARY:\n${r.executiveSummary}\n\n`;
      txt += `CHECKLIST:\n`;
      r.tasks.forEach((t, i) => {
        txt += `${i+1}. [${t.status === 'Done' ? 'DONE' : 'UNDONE'}] ${t.name}: ${formatTaskDetails(t)}\n`;
      });
      txt += `\nFINAL SUMMARY:\n${r.finalSummary}\n`;
      await navigator.clipboard.writeText(txt);
      alert('Report copied to clipboard!');
    };

    const downloadPdf = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const r = currentReport.value;
      const margin = 36;
      const width = doc.internal.pageSize.getWidth() - margin * 2;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, 30, width, 52, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Website Maintenance & Upgrade Report', margin + 14, 50);
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont('helvetica', 'normal');
      doc.text(r.websiteUrl + '   |   Report Date: ' + r.reportDate + '   |   Readiness: ' + r.completedTasks + '/' + r.totalTasks + ' Tasks (' + r.completionPercentage + '%)', margin + 14, 68);

      // Executive Summary box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, 90, width, 40, 3, 3, 'FD');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('EXECUTIVE SUMMARY', margin + 10, 102);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitExec = doc.splitTextToSize(r.executiveSummary, width - 20);
      doc.text(splitExec, margin + 10, 114);

      // Table of tasks
      const rows = r.tasks.map((t, idx) => [
        idx + 1,
        t.name,
        t.status === 'Done' ? 'DONE' : 'UNDONE',
        formatTaskDetails(t)
      ]);

      doc.autoTable({
        startY: 138,
        head: [['No.', 'Task Name', 'Status', 'Configuration / Notes / Version']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 24, halign: 'center' },
          1: { cellWidth: 155, fontStyle: 'bold' },
          2: { cellWidth: 55, halign: 'center' },
          3: { cellWidth: 'auto' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            if (data.cell.raw === 'DONE') {
              data.cell.styles.textColor = [5, 150, 105]; // emerald
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [220, 38, 38]; // rose
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        margin: { left: margin, right: margin }
      });

      // Clean filename
      const cleanName = r.websiteUrl.replace(/https?:\/\//i, '').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save('report-' + cleanName + '-' + r.reportDate + '.pdf');
    };

    onMounted(() => {
      fetchReports();
    });

    return {
      activeTab,
      websiteUrl,
      urlError,
      tasks,
      completedCount,
      percentage,
      expandedNotes,
      savedReports,
      currentReport,
      googleSheetUrl,
      autoSaveToSheet,
      sheetSyncing,
      sheetSyncingId,
      currentReportSavedToSheet,
      sheetSyncNotice,
      syncingAll,
      syncProgress,
      saveToGoogleSheet,
      syncAllToSheet,
      formatTaskDetails,
      removeTask,
      resetDefaultTasks,
      markAllTasks,
      getDefaultTasks,
      addCustomTask,
      fetchReports,
      generateReport,
      startNewReport,
      viewReport,
      editReport,
      duplicateReport,
      deleteReport,
      copyReportText,
      copySheetFormula,
      downloadPdf
    };
  }
}).mount('#app');
</script>

</body>
</html>
