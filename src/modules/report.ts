// MediTrack - Exportable Doctor Health Report Module (Daily, Weekly & Monthly PDF)

import { AppData } from '../types';
import { escapeHtml, formatTime } from '../utils';
import { calculateBMI } from './profile';
import { getHistoricalDataSummary } from '../storage';
import { t, formatNumber } from './i18n';

export function generateDoctorReportHTML(
  data: AppData,
  timeframeDays: number = 30,
  lang: 'en' | 'bn' = 'en'
): string {
  const summary = getHistoricalDataSummary(timeframeDays);
  
  const generatedAt = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());

  const patientName = data.profile?.name?.trim() || (lang === 'bn' ? 'নামবিহীন রোগী' : 'Confidential Patient');
  const patientWeight = summary.vitals.latestWeight || data.profile?.weightKg || 70;
  const patientHeight = data.profile?.heightCm || 170;
  const bmiResult = calculateBMI(patientWeight, patientHeight);

  // Period title based on days
  let reportTitle = t('report_title_monthly');
  if (timeframeDays === 1) {
    reportTitle = t('report_title_daily');
  } else if (timeframeDays <= 7) {
    reportTitle = t('report_title_weekly');
  }

  const periodDisplay = timeframeDays === 1
    ? `${summary.endDate}`
    : `${summary.startDate} — ${summary.endDate} (${formatNumber(timeframeDays, lang)} ${lang === 'bn' ? 'দিন' : 'days'})`;

  // Medicines Table rows
  const medRows = data.medicines.map(m => {
    const timesDisplay = (m.times && m.times.length > 0 ? m.times : [m.time])
      .map(formatTime)
      .join(', ');
    return `
      <tr>
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td>${escapeHtml(m.dosage)}</td>
        <td>${timesDisplay}</td>
        <td>${m.frequency.charAt(0).toUpperCase() + m.frequency.slice(1)}</td>
        <td>${formatNumber(m.inventory, lang)} ${lang === 'bn' ? 'ডোজ' : 'doses'} (${m.inventory <= 5 ? '⚠️ Low' : 'Adequate'})</td>
      </tr>
    `;
  }).join('');

  // Symptoms Badges
  const symptomRows = Object.entries(summary.mood.commonSymptoms).map(([symptom, count]) => `
    <span class="report-badge">${escapeHtml(symptom)} (${formatNumber(count, lang)}x)</span>
  `).join('');

  return `
    <div class="doctor-report-container">
      <div class="report-header">
        <div class="report-title-block">
          <h1>${reportTitle}</h1>
          <p class="report-meta">
            ${lang === 'bn' ? 'রোগী' : 'Patient'}: <strong>${escapeHtml(patientName)}</strong> · 
            ${lang === 'bn' ? 'সময়কাল' : 'Period'}: <strong>${periodDisplay}</strong> · 
            ${lang === 'bn' ? 'তৈরির তারিখ' : 'Generated'}: <strong>${generatedAt}</strong>
          </p>
        </div>
        <div class="report-watermark">${lang === 'bn' ? 'গোপনীয় স্বাস্থ্য রিপোর্ট' : 'CONFIDENTIAL MEDICAL REPORT'}</div>
      </div>

      <!-- Section 1: Demographics -->
      <div class="report-section">
        <h2>${t('patient_demographics')}</h2>
        <div class="report-grid-4">
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'রোগীর নাম' : 'Patient Name'}</span>
            <span class="box-value">${escapeHtml(patientName)}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'রক্তের গ্রুপ' : 'Blood Type'}</span>
            <span class="box-value">${escapeHtml(data.profile?.bloodType || 'O+')}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'উচ্চতা ও ওজন' : 'Height & Weight'}</span>
            <span class="box-value">${formatNumber(patientHeight, lang)} cm / ${formatNumber(patientWeight, lang)} kg</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'বিএমআই (BMI)' : 'BMI & Classification'}</span>
            <span class="box-value" style="color: ${bmiResult.color}">${formatNumber(bmiResult.bmi, lang)} (${bmiResult.category})</span>
          </div>
        </div>
        ${data.profile?.emergencyContact?.name ? `
          <div class="emergency-notice-box">
            <strong>${lang === 'bn' ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}:</strong> 
            ${escapeHtml(data.profile.emergencyContact.name)} (${escapeHtml(data.profile.emergencyContact.relationship || 'Primary')}) · 📞 ${escapeHtml(data.profile.emergencyContact.phone)}
          </div>
        ` : ''}
      </div>

      <!-- Section 2: Medication Adherence -->
      <div class="report-section">
        <h2>${t('med_adherence_section')}</h2>
        <div class="report-grid-3">
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'ওষুধ সেবনের হার' : 'Adherence Rate'}</span>
            <span class="box-value">${formatNumber(summary.adherence.percentage, lang)}%</span>
            <span class="box-sub">${formatNumber(summary.adherence.taken, lang)} / ${formatNumber(summary.adherence.total, lang)} ${lang === 'bn' ? 'ডোজ সেবন সম্পন্ন' : 'doses taken'}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'নিয়মিত প্রেসক্রিপশন' : 'Active Prescriptions'}</span>
            <span class="box-value">${formatNumber(data.medicines.length, lang)}</span>
            <span class="box-sub">${formatNumber(summary.adherence.skipped, lang)} ${lang === 'bn' ? 'ডোজ বাদ দেওয়া হয়েছে' : 'doses skipped'}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'স্টক অ্যালার্ট' : 'Low Supply Alerts'}</span>
            <span class="box-value">${formatNumber(data.medicines.filter(m => m.inventory <= 5).length, lang)}</span>
            <span class="box-sub">${lang === 'bn' ? '৫ বা কম ডোজ বাকি' : '≤ 5 doses left'}</span>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th>${lang === 'bn' ? 'ওষুধের নাম' : 'Medication'}</th>
              <th>${lang === 'bn' ? 'ডোজ' : 'Dosage'}</th>
              <th>${lang === 'bn' ? 'সেবনের সময়' : 'Schedule'}</th>
              <th>${lang === 'bn' ? 'ফ্রিকোয়েন্সি' : 'Frequency'}</th>
              <th>${lang === 'bn' ? 'বর্তমান স্টক' : 'Supply Remaining'}</th>
            </tr>
          </thead>
          <tbody>
            ${medRows || `<tr><td colspan="5">${lang === 'bn' ? 'কোনো সক্রিয় ওষুধ নিবন্ধিত নেই।' : 'No active medications registered.'}</td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- Section 3: Vitals -->
      <div class="report-section">
        <h2>${t('vitals_section')}</h2>
        <div class="report-grid-4">
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'ব্লাড প্রেশার (গড়)' : 'Avg Blood Pressure'}</span>
            <span class="box-value">${summary.vitals.avgSystolic ? `${formatNumber(summary.vitals.avgSystolic, lang)}/${formatNumber(summary.vitals.avgDiastolic!, lang)} mmHg` : 'N/A'}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'হার্ট রেট (গড়)' : 'Avg Heart Rate'}</span>
            <span class="box-value">${summary.vitals.avgHeartRate ? `${formatNumber(summary.vitals.avgHeartRate, lang)} bpm` : 'N/A'}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'রেকর্ডকৃত ওজন' : 'Recorded Weight'}</span>
            <span class="box-value">${formatNumber(patientWeight, lang)} kg</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'স্বাস্থ্যকর ওজনের সীমা' : 'Target Weight'}</span>
            <span class="box-value">${formatNumber(bmiResult.minHealthyWeight, lang)}–${formatNumber(bmiResult.maxHealthyWeight, lang)} kg</span>
          </div>
        </div>
      </div>

      <!-- Section 4: Hydration Balance -->
      <div class="report-section">
        <h2>${t('hydration_section')}</h2>
        <div class="report-grid-3">
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'দৈনিক গড় পানি পান' : 'Daily Avg Water Intake'}</span>
            <span class="box-value">${formatNumber(summary.hydration.dailyAvgMl, lang)} ml</span>
            <span class="box-sub">${lang === 'bn' ? 'টার্গেট' : 'Daily Target'}: ${formatNumber(data.settings.hydrationGoal, lang)} ml</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'মোট পানি পান' : 'Total Volume Logged'}</span>
            <span class="box-value">${formatNumber(summary.hydration.totalMl, lang)} ml</span>
            <span class="box-sub">${formatNumber(Math.round(summary.hydration.totalMl / 1000 * 10) / 10, lang)} Liters</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'টার্গেট পূরণের দিন' : 'Goal Met Days'}</span>
            <span class="box-value">${formatNumber(summary.hydration.goalMetDays, lang)} ${lang === 'bn' ? 'দিন' : 'days'}</span>
            <span class="box-sub">${formatNumber(summary.hydration.loggedDays, lang)} ${lang === 'bn' ? 'দিন রেকর্ডকৃত' : 'days logged'}</span>
          </div>
        </div>
      </div>

      <!-- Section 5: Sleep & Symptoms -->
      <div class="report-section">
        <h2>${t('symptoms_sleep_section')}</h2>
        <div class="report-grid-2">
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'গড় রাতের ঘুম' : 'Average Nightly Sleep'}</span>
            <span class="box-value">${summary.sleep.avgDuration ? `${formatNumber(summary.sleep.avgDuration, lang)} hrs` : 'N/A'}</span>
            <span class="box-sub">${summary.sleep.avgQuality ? `${'⭐'.repeat(Math.round(summary.sleep.avgQuality))} (${formatNumber(summary.sleep.avgQuality, lang)}/5)` : ''}</span>
          </div>
          <div class="report-stat-box">
            <span class="box-label">${lang === 'bn' ? 'গড় মানসিক সন্তুষ্টি' : 'Average Mood Rating'}</span>
            <span class="box-value">${summary.mood.avgScore ? `${formatNumber(summary.mood.avgScore, lang)} / 5.0` : 'N/A'}</span>
            <span class="box-sub">${formatNumber(summary.mood.totalLogged, lang)} ${lang === 'bn' ? 'দিন চেক-ইন সম্পন্ন' : 'check-ins recorded'}</span>
          </div>
        </div>
        <div class="symptom-frequency-block">
          <p class="symptom-title"><strong>${lang === 'bn' ? 'রিপোর্টকৃত শারীরিক লক্ষণসমূহ' : 'Reported Symptoms Breakdown'}:</strong></p>
          <div class="symptom-badge-list">
            ${symptomRows || `<p class="muted-note">${lang === 'bn' ? 'এই সময়কালে কোনো পুনরাবৃত্তিমূলক লক্ষণ রিপোর্ট করা হয়নি।' : 'No recurring symptoms logged during this period.'}</p>`}
          </div>
        </div>
      </div>

      <!-- Section 6: Physician Assessment & Signature -->
      <div class="report-section doctor-notes-section">
        <h2>${t('doctor_notes_title')}</h2>
        <div class="doctor-notes-lines"></div>
        <div class="doctor-signature-row">
          <div class="sig-col">
            <div class="sig-line"></div>
            <span>${t('doctor_sig_line')}</span>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <span>${lang === 'bn' ? 'হাসপাতাল / ক্লিনিকের সিলমোহর' : 'Clinic / Hospital Stamp'}</span>
          </div>
        </div>
      </div>

      <div class="report-footer">
        <p>${lang === 'bn' ? 'এই স্বাস্থ্য বিবরণীটি মেডিট্র্যাক অফলাইন প্ল্যাটফর্মে সংরক্ষিত তথ্য থেকে তৈরি করা হয়েছে। কোনো ক্লাউড ডাটাবেজে তথ্য সংরক্ষিত নেই।' : 'This confidential summary was generated via MediTrack local-first health dashboard. 100% private and stored on device.'}</p>
      </div>
    </div>
  `;
}

export function downloadPDFReport(
  data: AppData,
  timeframeDays: number = 30,
  lang: 'en' | 'bn' = 'en'
): void {
  const reportHtml = generateDoctorReportHTML(data, timeframeDays, lang);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert(lang === 'bn' ? 'অনুগ্রহ করে ব্রাউজারে পপ-আপ অনুমোদন করুন যাতে পিডিএফ রিপোর্ট তৈরি করা যায়।' : 'Please allow popups in your browser to generate the PDF report.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8" />
        <title>MediTrack - ${lang === 'bn' ? 'স্বাস্থ্য রিপোর্ট' : 'Health Report'} (${timeframeDays}d)</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: "Noto Sans Bengali", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            background: #f8fafc;
            line-height: 1.5;
          }
          .toolbar {
            position: sticky;
            top: 0;
            max-width: 850px;
            margin: 0 auto 20px;
            background: #0D9488;
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 15px rgba(13, 148, 136, 0.25);
          }
          .toolbar-title { font-size: 0.95rem; font-weight: 700; }
          .toolbar-actions { display: flex; gap: 10px; }
          .toolbar-btn {
            background: #ffffff;
            color: #0f766e;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          }
          .toolbar-btn:hover { background: #f0fdfa; transform: translateY(-1px); }
          .toolbar-btn-secondary { background: rgba(255, 255, 255, 0.2); color: #ffffff; }
          .toolbar-btn-secondary:hover { background: rgba(255, 255, 255, 0.3); }

          .doctor-report-container {
            max-width: 850px;
            margin: 0 auto;
            background: #ffffff;
            padding: 36px 40px;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          }
          .report-header {
            border-bottom: 2.5px solid #0D9488;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .report-title-block h1 { margin: 0 0 6px; font-size: 1.65rem; color: #0f766e; font-weight: 800; }
          .report-meta { margin: 0; font-size: 0.85rem; color: #64748b; }
          .report-watermark { font-size: 0.75rem; font-weight: 800; color: #0D9488; letter-spacing: 0.08em; text-align: right; }
          .report-section { margin-bottom: 26px; page-break-inside: avoid; }
          .report-section h2 {
            font-size: 1.12rem;
            color: #0f172a;
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 6px;
            margin: 0 0 14px;
            font-weight: 700;
          }
          .report-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
          .report-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
          .report-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
          .report-stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
          .box-label { display: block; font-size: 0.76rem; color: #64748b; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
          .box-value { font-size: 1.25rem; font-weight: 800; color: #0f766e; line-height: 1.2; }
          .box-sub { display: block; font-size: 0.75rem; color: #64748b; margin-top: 3px; font-weight: 500; }
          
          .emergency-notice-box {
            margin-top: 10px;
            font-size: 0.82rem;
            color: #334155;
            background: #f1f5f9;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
          }

          .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.88rem; }
          .report-table th, .report-table td { border: 1px solid #cbd5e1; padding: 9px 12px; text-align: left; }
          .report-table th { background: #f1f5f9; color: #334155; font-weight: 700; }
          
          .symptom-frequency-block { margin-top: 12px; }
          .symptom-title { margin: 0 0 6px; font-size: 0.86rem; color: #334155; }
          .symptom-badge-list { display: flex; flex-wrap: wrap; gap: 8px; }
          .report-badge { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 99px; padding: 4px 10px; font-size: 0.8rem; font-weight: 700; color: #0f766e; }
          .muted-note { color: #94a3b8; font-size: 0.84rem; margin: 0; font-style: italic; }

          .doctor-notes-section { border: 1px dashed #94a3b8; border-radius: 12px; padding: 18px 20px; background: #fafafa; margin-top: 24px; }
          .doctor-notes-lines {
            min-height: 70px;
            background: repeating-linear-gradient(transparent, transparent 23px, #e2e8f0 24px);
            margin: 10px 0 20px;
          }
          .doctor-signature-row { display: flex; justify-content: space-between; gap: 40px; margin-top: 20px; }
          .sig-col { flex: 1; text-align: center; }
          .sig-line { border-bottom: 1.5px solid #64748b; height: 35px; margin-bottom: 6px; }
          .sig-col span { font-size: 0.78rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }

          .report-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            margin-top: 28px;
            font-size: 0.75rem;
            color: #94a3b8;
            text-align: center;
          }

          @media print {
            body { background: #ffffff !important; padding: 0 !important; }
            .toolbar { display: none !important; }
            .doctor-report-container {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              max-width: 100% !important;
            }
            @page { margin: 1.2cm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <span class="toolbar-title">📄 ${lang === 'bn' ? 'মেডিকেল রিপোর্ট প্রিন্ট / পিডিএফ ডাউনলোড' : 'Medical Report Ready'}</span>
          <div class="toolbar-actions">
            <button class="toolbar-btn" onclick="window.print()">📥 ${lang === 'bn' ? 'পিডিএফ ডাউনলোড / প্রিন্ট' : 'Save as PDF / Print'}</button>
            <button class="toolbar-btn toolbar-btn-secondary" onclick="window.close()">✕ ${lang === 'bn' ? 'বন্ধ করুন' : 'Close'}</button>
          </div>
        </div>

        ${reportHtml}

        <script>
          // Open print dialog directly on load
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function printDoctorReport(data: AppData): void {
  const lang = data.settings.language || 'en';
  downloadPDFReport(data, 30, lang);
}
