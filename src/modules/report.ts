// MediTrack - Exportable Doctor Health Report Module

import { AppData } from '../types';
import { escapeHtml, formatTime } from '../utils';
import { getMoodAverage, getMostCommonSymptoms } from './journal';
import { getSleepAverage } from './sleep';
import { getVitalsAverages, getLatestVitals } from './vitals';
import { getTodaysProgress } from './medicine';

export function generateDoctorReportHTML(data: AppData): string {
  const printDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const latestVitals = getLatestVitals();
  const vitalsAvg = getVitalsAverages(30);
  const sleepAvg = getSleepAverage(30);
  const moodAvg = getMoodAverage(30);
  const commonSymptoms = getMostCommonSymptoms(30);
  const medProgress = getTodaysProgress();

  const totalLogs = data.medicineLogs.length;
  const takenLogs = data.medicineLogs.filter(l => l.taken).length;
  const overallAdherence = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : (medProgress.total > 0 ? medProgress.percentage : 100);

  const medRows = data.medicines.map(m => `
    <tr>
      <td><strong>${escapeHtml(m.name)}</strong></td>
      <td>${escapeHtml(m.dosage)}</td>
      <td>${formatTime(m.time)}</td>
      <td>${m.frequency.charAt(0).toUpperCase() + m.frequency.slice(1)}</td>
      <td>${m.inventory} doses (${m.inventory <= 5 ? '⚠️ Low' : 'Adequate'})</td>
    </tr>
  `).join('');

  const symptomRows = Object.entries(commonSymptoms).map(([symptom, count]) => `
    <span class="report-badge">${escapeHtml(symptom)} (${count}x)</span>
  `).join('');

  return `
    <div class="doctor-report-container">
      <div class="report-header">
        <div class="report-title-block">
          <h1>MediTrack Patient Health Summary</h1>
          <p class="report-meta">Generated on: <strong>${printDate}</strong></p>
        </div>
        <div class="report-watermark">CONFIDENTIAL MEDICAL SUMMARY</div>
      </div>

      <div class="report-section">
        <h2>1. Medication Schedule & Adherence</h2>
        <div class="report-grid-2">
          <div class="report-stat-box">
            <span class="box-label">Adherence Rate (Last 30 Days)</span>
            <span class="box-value">${overallAdherence}%</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">Active Prescriptions</span>
            <span class="box-value">${data.medicines.length}</span>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Time</th>
              <th>Frequency</th>
              <th>Supply Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${medRows || '<tr><td colspan="5">No active medications registered.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="report-section">
        <h2>2. Vital Signs & Clinical Readings</h2>
        <div class="report-grid-4">
          <div class="report-stat-box">
            <span class="box-label">Latest Blood Pressure</span>
            <span class="box-value">${latestVitals?.bloodPressure ? `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic} mmHg` : 'N/A'}</span>
            ${vitalsAvg.avgBloodPressure ? `<span class="box-sub">30d Avg: ${vitalsAvg.avgBloodPressure.systolic}/${vitalsAvg.avgBloodPressure.diastolic}</span>` : ''}
          </div>
          <div class="report-stat-box">
            <span class="box-label">Latest Heart Rate</span>
            <span class="box-value">${latestVitals?.heartRate ? `${latestVitals.heartRate} bpm` : 'N/A'}</span>
            ${vitalsAvg.avgHeartRate ? `<span class="box-sub">30d Avg: ${vitalsAvg.avgHeartRate} bpm</span>` : ''}
          </div>
          <div class="report-stat-box">
            <span class="box-label">Latest Weight</span>
            <span class="box-value">${latestVitals?.weight ? `${latestVitals.weight} kg` : 'N/A'}</span>
            ${vitalsAvg.avgWeight ? `<span class="box-sub">30d Avg: ${vitalsAvg.avgWeight} kg</span>` : ''}
          </div>
          <div class="report-stat-box">
            <span class="box-label">Body Temperature</span>
            <span class="box-value">${latestVitals?.temperature ? `${latestVitals.temperature}°C` : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="report-section">
        <h2>3. Symptoms & Mental Well-Being</h2>
        <div class="report-grid-2">
          <div class="report-stat-box">
            <span class="box-label">Average Mood Score</span>
            <span class="box-value">${moodAvg ? `${moodAvg} / 5.0` : 'N/A'}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">Average Nightly Sleep</span>
            <span class="box-value">${sleepAvg.avgDuration ? `${sleepAvg.avgDuration} hours` : 'N/A'}</span>
          </div>
        </div>
        <div class="symptom-frequency-block">
          <p class="symptom-title"><strong>Reported Symptoms (Last 30 Days):</strong></p>
          <div class="symptom-badge-list">
            ${symptomRows || '<p class="muted-note">No recurring symptoms logged during this period.</p>'}
          </div>
        </div>
      </div>

      <div class="report-footer">
        <p>This report was generated via MediTrack local-first health dashboard for consultation purposes with healthcare professionals.</p>
      </div>
    </div>
  `;
}

export function printDoctorReport(data: AppData): void {
  const reportHtml = generateDoctorReportHTML(data);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the printable doctor report.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>MediTrack - Doctor Health Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            background: #fff;
          }
          .doctor-report-container { max-width: 800px; margin: 0 auto; }
          .report-header { border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .report-title-block h1 { margin: 0 0 6px; font-size: 1.6rem; color: #0f766e; }
          .report-meta { margin: 0; font-size: 0.9rem; color: #64748b; }
          .report-watermark { font-size: 0.75rem; font-weight: bold; color: #0D9488; letter-spacing: 0.1em; }
          .report-section { margin-bottom: 24px; page-break-inside: avoid; }
          .report-section h2 { font-size: 1.15rem; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 14px; }
          .report-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
          .report-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
          .report-stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .box-label { display: block; font-size: 0.78rem; color: #64748b; margin-bottom: 4px; }
          .box-value { font-size: 1.25rem; font-weight: bold; color: #0f766e; }
          .box-sub { display: block; font-size: 0.75rem; color: #64748b; margin-top: 2px; }
          .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9rem; }
          .report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
          .report-table th { background: #f1f5f9; color: #475569; font-weight: 600; }
          .symptom-badge-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
          .report-badge { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 99px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600; }
          .report-footer { border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 24px; font-size: 0.78rem; color: #94a3b8; text-align: center; }
          @media print {
            body { padding: 0; }
            @page { margin: 1.5cm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        ${reportHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
