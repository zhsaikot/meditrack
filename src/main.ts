// src/main.ts
import './style.css'
import { Medicine, MoodEntry, VitalsLog, SleepLog, Appointment } from './types'
import { 
  getMedicines, 
  deleteMedicine,
  getTodayWater, 
  addWater, 
  resetWaterIfNewDay,
  getMoodEntries, 
  saveMoodEntry, 
  getTodayMood,
  getAppData,
  saveAppData,
  exportAllData,
  importAllData,
  getTodayDateString,
  getUserProfile,
  saveUserProfile,
  setCustomHydrationGoal,
  getAppLanguage,
  setAppLanguage,
  getHistoricalDataSummary
} from './storage'
import { calculateBMI, renderBMISpectrumSVG } from './modules/profile'
import { initVitalsModule, addVitalsLog, getLatestVitals, getVitalsAverages } from './modules/vitals'
import { initSleepModule, addSleepLog, getLatestSleep, getSleepAverage } from './modules/sleep'
import { initJournalModule, getMoodAverage } from './modules/journal'
import { initHydrationModule, getHydrationGoal, setHydrationGoal } from './modules/hydration'
import { 
  initMedicineModule, 
  getTodayMedicineList, 
  addMedicine,
  markMedicineTaken, 
  markMedicineSkipped, 
  unmarkMedicine, 
  getTodaysProgress,
  refillMedicine,
  getLowInventoryMedicines,
  TodayMedicineItem
} from './modules/medicine'
import { 
  initAppointmentsModule, 
  getUpcomingAppointments, 
  addAppointment, 
  deleteAppointment, 
  formatAppointmentDisplay, 
  getNextAppointment 
} from './modules/appointments'
import { getHealthInsight, formatTime, escapeHtml } from './utils'
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  startReminderScheduler,
  sendLocalNotification,
  showInAppToast,
  showQuickToast
} from './modules/notifications'
import { 
  getMilestones, 
  renderHydrationChartSVG, 
  renderMoodSleepChartSVG, 
  calculateCorrelationInsight 
} from './modules/trends'
import { printDoctorReport, downloadPDFReport } from './modules/report'
import { t, setLanguage, formatNumber, Language } from './modules/i18n'

const app = document.querySelector<HTMLDivElement>('#app')!;

// App State
let appState = {
  currentMood: 0,
  currentSymptoms: [] as string[],
  isDarkMode: false,
  notificationsEnabled: false,
  language: getAppLanguage() as Language,
  selectedTimeframe: 'weekly' as 'daily' | 'weekly' | 'monthly'
};

// Default dose time presets based on doses per day
const defaultTimesByCount: Record<number, string[]> = {
  1: ['09:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['08:00', '12:00', '16:00', '20:00']
};

// Load saved state
function loadAppState() {
  const data = getAppData();
  appState.isDarkMode = data.settings.theme === 'dark';
  appState.notificationsEnabled = data.settings.notificationsEnabled || false;
  appState.language = getAppLanguage();
  setLanguage(appState.language);

  if (appState.isDarkMode) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  
  // Initialize modules
  initVitalsModule(data);
  initSleepModule(data);
  initJournalModule(data);
  initHydrationModule(data);
  initMedicineModule(data);
  initAppointmentsModule(data);
  
  // Load today's mood if exists
  const todayMood = getTodayMood();
  if (todayMood) {
    appState.currentMood = todayMood.mood;
    appState.currentSymptoms = [...todayMood.symptoms];
  }

  // Start notification scheduler
  if (appState.notificationsEnabled) {
    startReminderScheduler(
      () => {
        const list = getTodayMedicineList();
        return list
          .filter(({ log }) => !log?.taken && !log?.skipped)
          .map(({ medicine, time, doseIndex }) => ({
            id: medicine.id,
            doseIndex,
            name: medicine.name,
            dosage: medicine.dosage,
            time: time
          }));
      },
      {
        onTakeMed: (id: string, doseIndex: number) => {
          markMedicineTaken(id, doseIndex);
          showQuickToast(t('toast_med_success'), '✨');
          renderApp();
        },
        onAddWater: () => {
          addWater(250);
          showQuickToast(t('toast_water_success'), '💧');
          renderApp();
        }
      }
    );
  }
}

function saveAppState() {
  const data = getAppData();
  data.settings.theme = appState.isDarkMode ? 'dark' : 'light';
  data.settings.notificationsEnabled = appState.notificationsEnabled;
  data.settings.language = appState.language;
  setAppLanguage(appState.language);
  saveAppData(data);
}

// Dynamically render time pickers in Add Medicine Form
function renderDoseTimeInputs(count: number, existingTimes: string[] = []) {
  const container = document.getElementById('dose-times-container');
  if (!container) return;
  const defaults = defaultTimesByCount[count] || ['09:00'];
  let html = '';
  for (let i = 0; i < count; i++) {
    const val = existingTimes[i] || defaults[i] || '09:00';
    const label = count > 1 
      ? t('dose_num_label', { num: formatNumber(i + 1) })
      : t('dose_time_label');
    html += `
      <label class="form-label">${label}
        <input type="time" class="med-dose-time" required value="${val}" />
      </label>
    `;
  }
  container.innerHTML = `<div class="dose-times-grid">${html}</div>`;
}

function renderApp() {
  resetWaterIfNewDay();
  const data = getAppData();
  const medicines = getMedicines();
  const waterAmount = getTodayWater();
  const hydrationGoal = getHydrationGoal();
  const waterProgress = Math.min((waterAmount / hydrationGoal) * 100, 100);
  const moodEntries = getMoodEntries();
  const latestVitals = getLatestVitals();
  const latestSleep = getLatestSleep();
  const nextAppt = getNextAppointment();
  const upcomingAppts = getUpcomingAppointments();
  
  // Calculate stats
  const medProgress = getTodaysProgress();
  const adherenceRate = medProgress.percentage;
  const sleepAvg = getSleepAverage(7);
  const moodAvg = getMoodAverage(7);
  
  const streakDays = calculateStreak(moodEntries);
  const milestoneData = getMilestones(streakDays);
  const lowInventoryMeds = getLowInventoryMedicines(5);

  const todaysMedList = getTodayMedicineList();
  const nextMedicine = todaysMedList
    .filter(({ log }) => !log?.taken && !log?.skipped)
    .sort((a, b) => a.time.localeCompare(b.time))[0];
  const latestMood = moodEntries[0];
  const todayLabel = new Intl.DateTimeFormat(appState.language === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date());
  
  const healthInsight = getHealthInsight({
    moodAvg: moodAvg,
    sleepAvg: sleepAvg.avgQuality,
    waterIntake: waterAmount,
    medicineAdherence: adherenceRate
  });

  const correlationInsight = calculateCorrelationInsight(
    data.hydrationLogs,
    data.sleepLogs,
    data.moodEntries
  );

  const medicineListHTML = todaysMedList.map(({ medicine, doseIndex, time, totalDoses, log }) => {
    const isNext = nextMedicine && nextMedicine.medicine.id === medicine.id && nextMedicine.doseIndex === doseIndex && !log?.taken && !log?.skipped;
    return `
      <div class="medicine-item ${log?.taken ? 'taken' : log?.skipped ? 'skipped' : ''}">
        <div class="med-info">
          <div class="med-title-row">
            <strong>${escapeHtml(medicine.name)}</strong>
            <span class="dosage">(${escapeHtml(medicine.dosage)})</span>
            ${totalDoses > 1 ? `<span class="dose-badge-pill">${t('dose_tag', { index: formatNumber(doseIndex + 1), total: formatNumber(totalDoses) })}</span>` : ''}
          </div>
          <div class="time">🕐 ${formatTime(time)}${isNext ? ` · <span class="next-tag">${t('next_up_badge')}</span>` : ''}</div>
          ${medicine.inventory <= 5 ? `
            <div class="low-stock">
              <span>${t('low_supply_warn', { count: formatNumber(medicine.inventory), plural: medicine.inventory === 1 ? '' : 's' })}</span>
              <button class="refill-btn" data-id="${medicine.id}" title="${t('restock_btn')}">${t('restock_btn')}</button>
            </div>
          ` : ''}
        </div>
        <div class="med-actions">
          ${!log?.taken && !log?.skipped ? `
            <button class="action-btn take-btn" data-id="${medicine.id}" data-dose-index="${doseIndex}" title="${t('take_btn_title')}" aria-label="${t('take_btn_title')}">✓</button>
            <button class="action-btn skip-btn" data-id="${medicine.id}" data-dose-index="${doseIndex}" title="${t('skip_btn_title')}" aria-label="${t('skip_btn_title')}">⊘</button>
          ` : `
            <button class="action-btn undo-btn" data-id="${medicine.id}" data-dose-index="${doseIndex}" title="${t('undo_btn_title')}" aria-label="${t('undo_btn_title')}">↩</button>
          `}
          <button class="delete-btn" data-id="${medicine.id}" title="${t('delete_btn_title')}" aria-label="${t('delete_btn_title')}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  const appointmentListHTML = upcomingAppts.map(appt => {
    const display = formatAppointmentDisplay(appt);
    return `
      <div class="appointment-item">
        <div class="appt-info">
          <div class="appt-title-row">
            <strong>${escapeHtml(appt.title)}</strong>
            <span class="appt-doctor">${t('with_doctor', { doctor: escapeHtml(appt.doctor) })}</span>
          </div>
          <div class="appt-meta">📅 ${display.dateDisplay} at ${display.timeDisplay} ${appt.location ? `· 📍 ${escapeHtml(appt.location)}` : ''}</div>
        </div>
        <div class="appt-actions">
          <span class="countdown-badge">${display.countdown}</span>
          <button class="delete-appt-btn" data-id="${appt.id}" title="${t('delete_appt_title')}" aria-label="${t('delete_appt_title')}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  const moodEmojis = [
    { val: 1, icon: '😫', label: t('mood_terrible') },
    { val: 2, icon: '😕', label: t('mood_bad') },
    { val: 3, icon: '😐', label: t('mood_okay') },
    { val: 4, icon: '🙂', label: t('mood_good') },
    { val: 5, icon: '😄', label: t('mood_great') }
  ];

  const symptomsList = [
    { id: 'Headache', label: t('symptom_headache') },
    { id: 'Fatigue', label: t('symptom_fatigue') },
    { id: 'Nausea', label: t('symptom_nausea') },
    { id: 'Pain', label: t('symptom_pain') },
    { id: 'Anxiety', label: t('symptom_anxiety') },
    { id: 'Dizziness', label: t('symptom_dizziness') },
    { id: 'Stress', label: t('symptom_stress') },
    { id: 'Insomnia', label: t('symptom_insomnia') },
  ];

  const todayMood = getTodayMood();
  const notesValue = todayMood ? todayMood.notes : '';

  const profile = getUserProfile();
  const userWeight = latestVitals?.weight || profile.weightKg || 70;
  const userHeight = profile.heightCm || 170;
  const bmiResult = calculateBMI(userWeight, userHeight);
  const firstName = profile.name?.trim() ? profile.name.trim().split(' ')[0] : '';
  const greetingEyebrow = firstName ? t('welcome_back', { name: escapeHtml(firstName.toUpperCase()) }) : t('good_to_see_you');

  // BMI Category & Advice localization
  const bmiCategoryMap: Record<string, string> = {
    'Underweight': t('underweight'),
    'Normal weight': t('normal_weight'),
    'Overweight': t('overweight'),
    'Obese': t('obese')
  };
  const localizedCategory = bmiCategoryMap[bmiResult.category] || bmiResult.category;

  let localizedAdvice = bmiResult.advice;
  if (bmiResult.bmi > 0) {
    if (bmiResult.bmi < 18.5) {
      localizedAdvice = t('advice_underweight', {
        min: formatNumber(bmiResult.minHealthyWeight),
        max: formatNumber(bmiResult.maxHealthyWeight)
      });
    } else if (bmiResult.bmi <= 24.9) {
      localizedAdvice = t('advice_normal', {
        min: formatNumber(bmiResult.minHealthyWeight),
        max: formatNumber(bmiResult.maxHealthyWeight)
      });
    } else if (bmiResult.bmi <= 29.9) {
      const diff = Math.round((userWeight - bmiResult.maxHealthyWeight) * 10) / 10;
      localizedAdvice = t('advice_overweight', {
        diff: formatNumber(diff),
        min: formatNumber(bmiResult.minHealthyWeight),
        max: formatNumber(bmiResult.maxHealthyWeight)
      });
    } else {
      localizedAdvice = t('advice_obese');
    }
  }

  const timeframeDays = appState.selectedTimeframe === 'daily' ? 1 : appState.selectedTimeframe === 'monthly' ? 30 : 7;
  const timeframeSummary = getHistoricalDataSummary(timeframeDays);

  app.innerHTML = `
    <div class="container">
      <header class="main-header">
        <div class="brand-lockup">
          <div class="brand-mark">✚</div>
          <div>
            <p class="eyebrow">${t('brand_eyebrow')}</p>
            <h1>${t('brand_name')}</h1>
            <p class="subtitle">${t('brand_subtitle')}</p>
          </div>
        </div>
      </header>

      <div class="date-strip">
        <span class="status-dot"></span>
        <span>${todayLabel}</span>
        <span class="date-strip-note">${healthInsight}</span>
      </div>

      <section class="welcome-panel">
        <div>
          <p class="eyebrow">${greetingEyebrow}</p>
          <h2>${firstName ? t('welcome_back', { name: escapeHtml(firstName) }) : t('take_day_step')}</h2>
          <p>${nextMedicine ? `${t('next_up_prefix')}<strong>${escapeHtml(nextMedicine.medicine.name)}</strong>${nextMedicine.totalDoses > 1 ? ` (${t('dose_tag', { index: formatNumber(nextMedicine.doseIndex + 1), total: formatNumber(nextMedicine.totalDoses) })})` : ''} ${t('at_time')} ${formatTime(nextMedicine.time)}.` : t('schedule_clear')}${nextAppt ? `<br>📅 <strong>${escapeHtml(nextAppt.title)}</strong> ${t('with_doctor', { doctor: escapeHtml(nextAppt.doctor) })} (${formatAppointmentDisplay(nextAppt).countdown})` : ''}</p>
        </div>
        <div class="welcome-orbit" aria-hidden="true"><span>✦</span></div>
      </section>

      <!-- Statistics Card (2x2 Grid Layout) -->
      <section class="card stats-card">
        <div class="section-heading light-heading">
          <div><p class="eyebrow">${t('overview_eyebrow')}</p><h2>${t('overview_title')}</h2></div>
          <span class="section-kicker">${t('live_badge')}</span>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${formatNumber(adherenceRate)}%</div>
            <div class="stat-label">${t('stat_adherence')}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${formatNumber(waterAmount)}${t('ml_unit')}</div>
            <div class="stat-label">${t('stat_water')}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${sleepAvg.avgDuration !== null ? formatNumber(sleepAvg.avgDuration) + t('hours_unit') : '--'}</div>
            <div class="stat-label">${t('stat_sleep')}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${formatNumber(streakDays)} ${t('days_unit')}</div>
            <div class="stat-label">${t('stat_streak')}</div>
          </div>
        </div>

        <!-- Milestones Strip -->
        <div class="milestones-strip">
          ${milestoneData.milestones.map(m => `
            <div class="milestone-badge ${m.unlocked ? '' : 'locked'}" title="${m.description}">
              <span>${m.icon}</span>
              <span>${m.title}</span>
            </div>
          `).join('')}
        </div>
        ${milestoneData.nextBadge ? `
          <div class="badge-progress-bar" title="Next Badge: ${milestoneData.nextBadge.title} (${milestoneData.progressToNext}% to goal)">
            <div class="badge-progress-fill" style="width: ${milestoneData.progressToNext}%"></div>
          </div>
        ` : ''}
      </section>

      <!-- Quick Actions Bar -->
      <section class="card quick-actions">
        <div class="section-heading">
          <div><p class="eyebrow">${t('quick_log_eyebrow')}</p><h2>${t('quick_log_title')}</h2></div>
        </div>
        <div class="quick-grid">
          <button class="quick-btn" id="show-vitals-btn">${t('log_vitals_btn')}</button>
          <button class="quick-btn" id="show-sleep-btn">${t('log_sleep_btn')}</button>
          <button class="quick-btn" id="show-appointment-btn">${t('add_visit_btn')}</button>
        </div>
      </section>

      <!-- Harmonized Hydration Tracker -->
      <section class="card water-card">
        <div class="section-heading">
          <div><p class="eyebrow">${t('hydration_eyebrow')}</p><h2>${t('hydration_title')}</h2></div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="goal-setting-btn" id="edit-water-goal-btn" title="Customize daily water goal">⚙️ ${formatNumber(hydrationGoal)}${t('ml_unit')} Goal</button>
            <span class="water-icon">💧</span>
          </div>
        </div>
        <p class="card-intro">${waterAmount >= hydrationGoal ? t('water_intro_at_goal') : t('water_intro_remaining', { remaining: formatNumber(hydrationGoal - waterAmount) })}</p>
        <div class="water-progress">
          <div class="progress-bar" style="width: ${waterProgress}%"></div>
        </div>
        <div class="water-stats">
          <span>${formatNumber(waterAmount)}${t('ml_unit')} / ${formatNumber(hydrationGoal)}${t('ml_unit')}</span>
          <span>${formatNumber(Math.round(waterProgress))}%</span>
        </div>
        <div class="water-actions">
          <button class="btn-water secondary-water" id="remove-water-btn" aria-label="Remove 250ml">${t('remove_250ml')}</button>
          <button class="btn-water" id="add-water-btn">${t('add_250ml')} <span>+</span></button>
        </div>
      </section>

      <!-- Body Mass Index (BMI) & Biometrics Card -->
      <section class="card bmi-card">
        <div class="section-heading">
          <div><p class="eyebrow" style="color: ${bmiResult.color}">${t('bmi_eyebrow')}</p><h2>${t('bmi_title')}</h2></div>
          <span class="bmi-badge" style="background: ${bmiResult.badgeBg}; color: ${bmiResult.color}">● ${localizedCategory}</span>
        </div>
        
        <div class="bmi-grid">
          <div class="bmi-stat-box">
            <span class="bmi-stat-label">${t('current_bmi')}</span>
            <span class="bmi-stat-num" style="color: ${bmiResult.color}">${formatNumber(bmiResult.bmi || '--')}</span>
            <span class="bmi-stat-sub">${t('target_bmi_range')}</span>
          </div>
          <div class="bmi-stat-box">
            <span class="bmi-stat-label">${t('recorded_weight')}</span>
            <span class="bmi-stat-num">${formatNumber(userWeight)} <span style="font-size:0.9rem; font-weight:600;">kg</span></span>
            <span class="bmi-stat-sub">${t('height_prefix', { height: formatNumber(userHeight) })}</span>
          </div>
          <div class="bmi-stat-box">
            <span class="bmi-stat-label">${t('healthy_weight_range')}</span>
            <span class="bmi-stat-num" style="font-size: 1.25rem;">${formatNumber(bmiResult.minHealthyWeight)}–${formatNumber(bmiResult.maxHealthyWeight)} <span style="font-size:0.85rem; font-weight:600;">kg</span></span>
            <span class="bmi-stat-sub">${t('who_standard')}</span>
          </div>
        </div>

        ${renderBMISpectrumSVG(bmiResult.bmi)}

        <div class="bmi-advice-box">
          <span>💡 ${escapeHtml(localizedAdvice)}</span>
          <button class="bmi-edit-link" id="bmi-update-metrics-btn">${t('edit_profile_btn')}</button>
        </div>
      </section>

      <!-- Mood & Symptom Journal -->
      <section class="card mood-card">
        <div class="section-heading">
          <div><p class="eyebrow">${t('mental_eyebrow')}</p><h2>${t('mental_title')}</h2></div>
          <span class="section-icon">☼</span>
        </div>
        <p class="mood-prompt">${t('rate_mood_prompt')}</p>
        <div class="emoji-grid">
          ${moodEmojis.map(e => `
            <button class="emoji-btn ${appState.currentMood === e.val ? 'selected' : ''}" data-mood="${e.val}">
              <span class="emoji-icon">${e.icon}</span>
              <span class="emoji-label">${e.label}</span>
            </button>
          `).join('')}
        </div>

        <p class="mood-prompt">${t('any_symptoms_prompt')}</p>
        <div class="symptom-grid">
          ${symptomsList.map(s => {
            const isSelected = appState.currentSymptoms.includes(s.id);
            return `
              <button class="symptom-btn ${isSelected ? 'selected' : ''}" data-symptom="${s.id}">
                ${isSelected ? '✓ ' : ''}${s.label}
              </button>
            `;
          }).join('')}
        </div>

        <textarea id="mood-notes" placeholder="${t('journal_placeholder')}" rows="3">${escapeHtml(notesValue)}</textarea>
        <button class="btn-primary" id="save-mood-btn">${t('save_checkin_btn')} <span>→</span></button>
      </section>

      <!-- Historical Trends & Behavioral Patterns -->
      <section class="card trends-card">
        <div class="trends-header-row">
          <div>
            <p class="eyebrow">${t('trends_eyebrow')}</p>
            <h2>${t('trends_title')}</h2>
          </div>
          <div class="timeframe-switcher" role="tablist" aria-label="${t('timeframe_label')}">
            <button type="button" class="timeframe-btn ${appState.selectedTimeframe === 'daily' ? 'active' : ''}" data-timeframe="daily">
              ${t('view_daily')}
            </button>
            <button type="button" class="timeframe-btn ${appState.selectedTimeframe === 'weekly' ? 'active' : ''}" data-timeframe="weekly">
              ${t('view_weekly')}
            </button>
            <button type="button" class="timeframe-btn ${appState.selectedTimeframe === 'monthly' ? 'active' : ''}" data-timeframe="monthly">
              ${t('view_monthly')}
            </button>
          </div>
        </div>

        <!-- Period Summary Metrics Banner -->
        <div class="timeframe-summary-banner">
          <div class="timeframe-stat-item">
            <span class="timeframe-stat-val">${formatNumber(timeframeSummary.adherence.percentage, appState.language)}%</span>
            <span class="timeframe-stat-label">${t('stat_adherence')}</span>
          </div>
          <div class="timeframe-stat-item">
            <span class="timeframe-stat-val">${formatNumber(timeframeSummary.hydration.dailyAvgMl, appState.language)} ${t('ml_unit')}</span>
            <span class="timeframe-stat-label">${t('stat_water')} (Avg)</span>
          </div>
          <div class="timeframe-stat-item">
            <span class="timeframe-stat-val">${timeframeSummary.sleep.avgDuration !== null ? formatNumber(timeframeSummary.sleep.avgDuration, appState.language) + t('hours_unit') : '--'}</span>
            <span class="timeframe-stat-label">${t('stat_sleep')}</span>
          </div>
          <div class="timeframe-stat-item">
            <span class="timeframe-stat-val">${timeframeSummary.vitals.avgSystolic && timeframeSummary.vitals.avgDiastolic ? `${formatNumber(timeframeSummary.vitals.avgSystolic, appState.language)}/${formatNumber(timeframeSummary.vitals.avgDiastolic, appState.language)}` : '--'}</span>
            <span class="timeframe-stat-label">${appState.language === 'bn' ? 'গড় রক্তচাপ' : 'Avg BP'}</span>
          </div>
        </div>

        <div class="trend-chart-container">
          <div class="trend-chart-header">
            <span>${t('chart_hydration_title')} (${appState.selectedTimeframe === 'daily' ? t('view_daily') : appState.selectedTimeframe === 'monthly' ? t('view_monthly') : t('view_weekly')})</span>
            <span class="trend-legend"><span class="legend-item"><span class="legend-color" style="background:#0D9488"></span> ${t('chart_goal_met')}</span></span>
          </div>
          ${renderHydrationChartSVG(data.hydrationLogs, hydrationGoal, timeframeDays)}
        </div>

        <div class="trend-chart-container">
          <div class="trend-chart-header">
            <span>${t('chart_med_sleep_title')} (${appState.selectedTimeframe === 'daily' ? t('view_daily') : appState.selectedTimeframe === 'monthly' ? t('view_monthly') : t('view_weekly')})</span>
            <div class="trend-legend">
              <span class="legend-item"><span class="legend-color" style="background:#8B5CF6"></span> ${t('chart_legend_med')}</span>
              <span class="legend-item"><span class="legend-color" style="background:#3B82F6"></span> ${t('chart_legend_sleep')}</span>
            </div>
          </div>
          ${renderMoodSleepChartSVG(data.moodEntries, data.sleepLogs, timeframeDays)}
        </div>

        <div class="correlation-box">
          ${correlationInsight}
        </div>

        <div class="timeframe-footer-actions">
          <button type="button" class="timeframe-report-btn" id="open-report-from-trends-btn">
            📄 ${t('download_pdf_report')}
          </button>
        </div>
      </section>

      <!-- Latest Vitals Display -->
      ${latestVitals ? `
      <section class="card vitals-display">
        <div class="section-heading">
          <div><p class="eyebrow">${t('vitals_eyebrow')}</p><h2>${t('vitals_title')}</h2></div>
          <span class="section-icon">❤️</span>
        </div>
        <div class="vitals-grid">
          ${latestVitals.heartRate ? `<div class="vital-item"><span class="vital-label">${t('heart_rate_label')}</span><span class="vital-value">${formatNumber(latestVitals.heartRate)} bpm</span></div>` : ''}
          ${latestVitals.bloodPressure ? `<div class="vital-item"><span class="vital-label">${t('blood_pressure_label')}</span><span class="vital-value">${formatNumber(latestVitals.bloodPressure.systolic)}/${formatNumber(latestVitals.bloodPressure.diastolic)} mmHg</span></div>` : ''}
          ${latestVitals.weight ? `<div class="vital-item"><span class="vital-label">${t('weight_modal_label')}</span><span class="vital-value">${formatNumber(latestVitals.weight)} kg</span></div>` : ''}
          ${latestVitals.temperature ? `<div class="vital-item"><span class="vital-label">${t('temperature_label')}</span><span class="vital-value">${formatNumber(latestVitals.temperature)}°C</span></div>` : ''}
        </div>
      </section>
      ` : ''}

      <!-- Latest Sleep Display -->
      ${latestSleep ? `
      <section class="card sleep-display">
        <div class="section-heading">
          <div><p class="eyebrow">${t('sleep_eyebrow')}</p><h2>${t('sleep_title')}</h2></div>
          <span class="section-icon">🌙</span>
        </div>
        <div class="sleep-summary">
          <div class="sleep-stat"><span class="sleep-value">${formatNumber(latestSleep.duration)}${t('hours_unit')}</span><span class="sleep-label">${t('duration_label')}</span></div>
          <div class="sleep-stat"><span class="sleep-value">${'⭐'.repeat(latestSleep.quality)}${'☆'.repeat(5 - latestSleep.quality)}</span><span class="sleep-label">${t('quality_label')}</span></div>
          <div class="sleep-stat"><span class="sleep-value">${formatTime(latestSleep.bedtime)} - ${formatTime(latestSleep.wakeTime)}</span><span class="sleep-label">${t('schedule_label')}</span></div>
        </div>
      </section>
      ` : ''}

      <section class="insight-row">
        <div class="card insight-card">
          <p class="eyebrow">${t('recent_note_eyebrow')}</p>
          <h3>${latestMood ? `${escapeHtml(latestMood.notes) || t('checked_in_today')}` : t('journal_ready')}</h3>
          <p class="muted-copy">${latestMood ? `${latestMood.symptoms.length ? latestMood.symptoms.map(escapeHtml).join(' · ') : t('no_symptoms_logged')} · ${t('mood_label', { val: formatNumber(latestMood.mood) })}` : t('consistency_starts')}</p>
        </div>
        <div class="card insight-card accent-insight">
          <p class="eyebrow">${t('todays_focus_eyebrow')}</p>
          <h3>${medProgress.total === 0 ? t('build_routine') : adherenceRate === 100 ? t('all_meds_taken') : t('meds_remaining', { count: formatNumber(medProgress.total - medProgress.taken), plural: (medProgress.total - medProgress.taken === 1 ? '' : 's') })}</h3>
          <p class="muted-copy">${streakDays > 1 ? t('streak_progress', { count: formatNumber(streakDays) }) : t('consistency_starts')}</p>
        </div>
      </section>

      <!-- Medicine Section (Add Medicine Form with Doses per day) -->
      <section class="card add-med-card">
        <div class="section-heading">
          <div><p class="eyebrow">${t('routine_eyebrow')}</p><h2>${t('routine_title')}</h2></div>
          <span class="section-icon">＋</span>
        </div>
        <form id="add-med-form">
          <input type="text" id="med-name" placeholder="${t('med_name_ph')}" required />
          <input type="text" id="med-dosage" placeholder="${t('med_dosage_ph')}" required />
          
          <div class="form-row">
            <label class="form-label">${t('doses_per_day_label')}
              <select id="med-doses-per-day">
                <option value="1">${t('dose_1_time')}</option>
                <option value="2">${t('dose_2_times')}</option>
                <option value="3">${t('dose_3_times')}</option>
                <option value="4">${t('dose_4_times')}</option>
              </select>
            </label>
            <label class="form-label">${t('frequency_label')}
              <select id="med-frequency">
                <option value="daily">${t('freq_daily')}</option>
                <option value="weekdays">${t('freq_weekdays')}</option>
                <option value="weekends">${t('freq_weekends')}</option>
              </select>
            </label>
          </div>

          <div id="dose-times-container">
            <!-- Dynamic dose time pickers rendered here -->
          </div>

          <div class="form-row">
            <label class="form-label">${t('initial_supply_label')}
              <input type="number" id="med-inventory" placeholder="${t('pills_left_ph')}" min="0" value="30" />
            </label>
          </div>
          <button type="submit" class="btn-primary">${t('add_medicine_btn')}</button>
        </form>
      </section>

      <!-- Medicine Schedule Card with Empty State Routing -->
      <section class="card list-card" id="medicine-schedule-section">
        <div class="section-heading">
          <div><p class="eyebrow">${t('schedule_eyebrow')}</p><h2>${t('schedule_title')}</h2></div>
          <span class="progress-pill">${t('taken_badge', { taken: formatNumber(medProgress.taken), total: formatNumber(medProgress.total) })}</span>
        </div>

        ${lowInventoryMeds.length > 0 ? `
          <div class="refill-alert-banner">
            <span>${t('refill_alert_banner', { count: formatNumber(lowInventoryMeds.length), plural: lowInventoryMeds.length > 1 ? 's have' : ' has' })}</span>
          </div>
        ` : ''}

        <div id="medicine-list">
          ${todaysMedList.length === 0 ? `
            <div class="empty-state-box">
              <div class="empty-state-icon">💊</div>
              <h3 class="empty-state-title">${t('empty_meds_title')}</h3>
              <p class="empty-state-desc">${t('empty_meds_desc')}</p>
              <button class="empty-state-btn" id="empty-add-med-btn">${t('empty_meds_btn')}</button>
            </div>
          ` : medicineListHTML}
        </div>
      </section>

      <!-- Appointments List Section -->
      <section class="card appointments-card">
        <div class="section-heading">
          <div><p class="eyebrow">${t('appts_eyebrow')}</p><h2>${t('appts_title')}</h2></div>
          <span class="progress-pill">${t('appts_scheduled', { count: formatNumber(upcomingAppts.length) })}</span>
        </div>
        <div id="appointments-list">
          ${upcomingAppts.length === 0 ? `<p class="empty-state">${t('no_appts')}</p>` : appointmentListHTML}
        </div>
      </section>

      <!-- App Footer -->
      <footer class="app-footer">
        <p class="copyright-text">${appState.language === 'bn' ? 'তৈরি করেছেন' : 'Created by'} <a href="https://www.instagram.com/zhsaikot" target="_blank" rel="noopener noreferrer" class="creator-link">MD. Ziaul Hasan</a></p>
      </footer>

      <!-- Sticky Bottom Quick Navigation Bar -->
      <nav class="bottom-nav-bar" aria-label="Quick Navigation">
        <button class="bottom-nav-item" id="nav-meds-btn" data-target="#medicine-schedule-section" title="${t('nav_medicines')}">
          <span class="bottom-nav-icon">💊</span>
          <span class="bottom-nav-label">${t('nav_medicines')}</span>
        </button>
        <button class="bottom-nav-item" id="nav-water-btn" data-target=".water-card" title="${t('nav_hydration')}">
          <span class="bottom-nav-icon">💧</span>
          <span class="bottom-nav-label">${t('nav_hydration')}</span>
        </button>
        <button class="bottom-nav-item" id="nav-vitals-btn" data-target=".quick-actions" title="${t('nav_vitals')}">
          <span class="bottom-nav-icon">❤️</span>
          <span class="bottom-nav-label">${t('nav_vitals')}</span>
        </button>
        <button class="bottom-nav-item" id="nav-profile-btn" title="${t('nav_profile')}">
          <span class="bottom-nav-icon">
            ${profile.avatarUrl ? `
              <img src="${profile.avatarUrl}" class="nav-avatar-img" alt="Profile" />
            ` : `
              <svg class="nav-profile-svg" viewBox="0 0 24 24" width="22" height="22">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            `}
          </span>
          <span class="bottom-nav-label">${t('nav_profile')}</span>
        </button>
      </nav>
    </div>
    
    <!-- Vitals Modal -->
    <dialog id="vitals-modal" class="modal">
      <div class="modal-content">
        <h3>${t('vitals_modal_title')}</h3>
        <form id="vitals-form">
          <label>${t('heart_rate_label')}<input type="number" id="vitals-hr" placeholder="e.g., 72" min="30" max="250" /></label>
          <label>${t('blood_pressure_label')}<input type="text" id="vitals-bp" placeholder="e.g., 120/80" pattern="\\d{2,3}/\\d{2,3}" title="Format: 120/80" /></label>
          <label>${t('weight_modal_label')}<input type="number" id="vitals-weight" step="0.1" placeholder="e.g., 70.5" min="1" max="500" /></label>
          <label>${t('temperature_label')}<input type="number" id="vitals-temp" step="0.1" placeholder="e.g., 36.6" min="30" max="45" /></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-vitals-btn">${t('cancel_btn')}</button>
            <button type="submit" class="btn-primary">${t('save_vitals_btn')}</button>
          </div>
        </form>
      </div>
    </dialog>
    
    <!-- Sleep Modal -->
    <dialog id="sleep-modal" class="modal">
      <div class="modal-content">
        <h3>${t('sleep_modal_title')}</h3>
        <form id="sleep-form">
          <label>${t('bedtime_label')}<input type="time" id="sleep-bedtime" value="23:00" required /></label>
          <label>${t('waketime_label')}<input type="time" id="sleep-waketime" value="07:00" required /></label>
          <label>${t('sleep_quality_label', { stars: '<span id="quality-display">3</span>' })}
            <input type="range" id="sleep-quality" min="1" max="5" value="3" />
          </label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-sleep-btn">${t('cancel_btn')}</button>
            <button type="submit" class="btn-primary">${t('save_sleep_btn')}</button>
          </div>
        </form>
      </div>
    </dialog>
    
    <!-- Appointment Modal -->
    <dialog id="appointment-modal" class="modal">
      <div class="modal-content">
        <h3>${t('appt_modal_title')}</h3>
        <form id="appointment-form">
          <label>${t('appt_title_field')}<input type="text" id="appt-title" placeholder="${t('appt_title_ph')}" required /></label>
          <label>${t('appt_doctor_field')}<input type="text" id="appt-doctor" placeholder="${t('appt_doctor_ph')}" required /></label>
          <label>${t('appt_date_field')}<input type="date" id="appt-date" value="${getTodayDateString()}" required /></label>
          <label>${t('appt_time_field')}<input type="time" id="appt-time" value="10:00" required /></label>
          <label>${t('appt_location_field')}<input type="text" id="appt-location" placeholder="${t('appt_location_ph')}" /></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-appt-btn">${t('cancel_btn')}</button>
            <button type="submit" class="btn-primary">${t('add_visit_btn')}</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- Profile Setup & Settings Modal -->
    <dialog id="profile-modal" class="modal">
      <div class="modal-content profile-modal-content">
        <!-- Top Header with Integrated Avatar -->
        <div class="profile-header-banner">
          <div class="profile-avatar-inline">
            <div class="avatar-preview-circle" id="profile-avatar-preview">
              ${profile.avatarUrl ? `<img src="${profile.avatarUrl}" alt="Profile avatar" />` : `<span class="avatar-preview-fallback">${firstName ? escapeHtml(firstName[0]) : '👤'}</span>`}
            </div>
            <div class="avatar-meta-inline">
              <div class="avatar-btn-row">
                <label class="avatar-upload-btn" for="avatar-file-input">
                  📷 ${profile.avatarUrl ? t('avatar_change_btn') : 'Upload Photo'}
                </label>
                <input type="file" id="avatar-file-input" accept="image/*" style="display:none;" />
                <button type="button" class="avatar-remove-btn" id="remove-avatar-btn" style="${profile.avatarUrl ? '' : 'display:none;'}">${t('avatar_remove_btn')}</button>
              </div>
              <span class="avatar-hint">${t('avatar_hint')}</span>
            </div>
          </div>

          <div class="profile-title-and-close">
            <h3 class="profile-modal-heading">${t('profile_modal_heading')}</h3>
            <button type="button" class="modal-close-icon" id="close-profile-x" aria-label="Close modal">✕</button>
          </div>
        </div>

        <!-- Section 1: App Preferences & Settings -->
        <div class="profile-preferences-section">
          <div class="profile-section-legend">⚙️ ${t('preferences_legend')}</div>
          <div class="profile-preferences-row">
            <div class="pref-item">
              <span class="pref-label">${t('language_label')}</span>
              <button type="button" class="pref-toggle-btn" id="modal-toggle-lang-btn" title="${t('switch_language')}">
                <span class="pref-icon">🌐</span>
                <span>${appState.language === 'bn' ? 'বাংলা' : 'English'}</span>
              </button>
            </div>
            <div class="pref-item">
              <span class="pref-label">${t('reminders_label')}</span>
              <button type="button" class="pref-toggle-btn ${appState.notificationsEnabled ? 'active' : ''}" id="modal-toggle-notifications-btn" title="${appState.notificationsEnabled ? t('reminders_active') : t('enable_reminders')}">
                <span class="pref-icon">${appState.notificationsEnabled ? '🔔' : '🔕'}</span>
                <span>${appState.notificationsEnabled ? t('status_enabled') : t('status_disabled')}</span>
              </button>
            </div>
            <div class="pref-item">
              <span class="pref-label">${t('theme_label')}</span>
              <button type="button" class="pref-toggle-btn" id="modal-toggle-theme-btn" title="${t('toggle_theme_title')}">
                <span class="pref-icon">${appState.isDarkMode ? '🌙' : '☀️'}</span>
                <span>${appState.isDarkMode ? t('theme_dark') : t('theme_light')}</span>
              </button>
            </div>
          </div>
        </div>

        <form id="profile-form">
          <!-- 3-Column Balanced Biometrics Grid -->
          <div class="profile-fields-grid">
            <div class="field-fullname">
              <label class="form-label" for="profile-name">${t('fullname_label')}</label>
              <input type="text" id="profile-name" placeholder="${t('fullname_ph')}" value="${escapeHtml(profile.name || '')}" />
            </div>

            <div class="field-blood">
              <label class="form-label" for="profile-blood-type">${t('blood_type_label')}</label>
              <select id="profile-blood-type">
                <option value="A+" ${profile.bloodType === 'A+' ? 'selected' : ''}>A+</option>
                <option value="A-" ${profile.bloodType === 'A-' ? 'selected' : ''}>A-</option>
                <option value="B+" ${profile.bloodType === 'B+' ? 'selected' : ''}>B+</option>
                <option value="B-" ${profile.bloodType === 'B-' ? 'selected' : ''}>B-</option>
                <option value="AB+" ${profile.bloodType === 'AB+' ? 'selected' : ''}>AB+</option>
                <option value="AB-" ${profile.bloodType === 'AB-' ? 'selected' : ''}>AB-</option>
                <option value="O+" ${profile.bloodType === 'O+' ? 'selected' : ''}>O+</option>
                <option value="O-" ${profile.bloodType === 'O-' ? 'selected' : ''}>O-</option>
              </select>
            </div>

            <div class="field-height">
              <label class="form-label" for="profile-height">${t('height_cm_label')}</label>
              <input type="number" id="profile-height" placeholder="170" min="50" max="260" required value="${profile.heightCm || 170}" />
            </div>

            <div class="field-weight">
              <label class="form-label" for="profile-weight">${t('weight_kg_label')}</label>
              <input type="number" id="profile-weight" step="0.1" placeholder="70.0" min="20" max="400" required value="${profile.weightKg || 70}" />
            </div>

            <div class="field-water">
              <label class="form-label" for="profile-water-goal">${t('water_goal_label')}</label>
              <input type="number" id="profile-water-goal" placeholder="2000" min="500" max="8000" step="50" required value="${hydrationGoal}" />
            </div>
          </div>

          <!-- Section 2: Compact Emergency Contact Strip -->
          <div class="emergency-contact-fieldset">
            <div class="profile-section-legend">${t('emergency_legend')}</div>
            <div class="emergency-fields-grid">
              <div class="field-em-name">
                <label class="form-label" for="profile-emergency-name">${t('em_name_label')}</label>
                <input type="text" id="profile-emergency-name" placeholder="${t('em_name_ph')}" value="${escapeHtml(profile.emergencyContact?.name || '')}" />
              </div>

              <div class="field-em-phone">
                <label class="form-label" for="profile-emergency-phone">${t('em_phone_label')}</label>
                <input type="tel" id="profile-emergency-phone" placeholder="${t('em_phone_ph')}" value="${escapeHtml(profile.emergencyContact?.phone || '')}" />
              </div>

              <div class="field-em-rel">
                <label class="form-label" for="profile-emergency-rel">${t('em_rel_label')}</label>
                <input type="text" id="profile-emergency-rel" placeholder="${t('em_rel_ph')}" value="${escapeHtml(profile.emergencyContact?.relationship || '')}" />
              </div>
            </div>
          </div>

          <!-- Section 3: Data Backup & Restore -->
          <div class="profile-backup-section">
            <h4 class="profile-backup-title">💾 ${t('backup_section_title')}</h4>
            <p class="profile-backup-desc">${t('backup_section_desc')}</p>
            <div class="profile-backup-row">
              <button type="button" class="profile-backup-btn" id="modal-export-data-btn">
                💾 ${t('backup_download_btn')}
              </button>
              <label class="profile-backup-btn" for="modal-import-file">
                📁 ${t('backup_restore_btn')}
              </label>
              <input type="file" id="modal-import-file" accept=".json" style="display:none;" />
            </div>
            <div style="margin-top: 10px;">
              <button type="button" class="profile-backup-btn" id="modal-pdf-report-btn" style="width: 100%;">
                📄 ${t('download_pdf_report')}
              </button>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="profile-modal-actions">
            <button type="button" class="btn-secondary" id="close-profile-btn">${t('cancel_btn')}</button>
            <button type="submit" class="btn-primary">${t('save_profile_btn')}</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- Quick Water Goal Modal -->
    <dialog id="goal-modal" class="modal">
      <div class="modal-content goal-modal-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <h3 style="margin:0;">${t('goal_modal_title')}</h3>
          <button type="button" class="icon-btn" id="close-goal-x" style="border:none; width:30px; height:30px; font-size:1.1rem; cursor:pointer;">✕</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">
          ${t('goal_modal_desc')}
        </p>
        <form id="quick-goal-form">
          <label class="form-label">${t('target_intake_label')}
            <input type="number" id="quick-goal-input" min="500" max="8000" step="50" value="${hydrationGoal}" required />
          </label>
          <div style="display:flex; gap:8px; margin: 12px 0;">
            <button type="button" class="goal-preset-btn" data-ml="1500" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">1500ml</button>
            <button type="button" class="goal-preset-btn" data-ml="2000" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">2000ml</button>
            <button type="button" class="goal-preset-btn" data-ml="2500" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">2500ml</button>
            <button type="button" class="goal-preset-btn" data-ml="3000" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">3000ml</button>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-goal-btn">${t('cancel_btn')}</button>
            <button type="submit" class="btn-primary">${t('save_goal_btn')}</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- PDF Health Report Modal -->
    <dialog id="report-modal" class="modal">
      <div class="modal-content report-modal-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <h3 style="margin:0;">📄 ${t('pdf_modal_title')}</h3>
          <button type="button" class="icon-btn" id="close-report-x" style="border:none; width:30px; height:30px; font-size:1.1rem; cursor:pointer;">✕</button>
        </div>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.45;">
          ${t('pdf_modal_desc')}
        </p>

        <form id="generate-report-form">
          <div class="report-option-group">
            <label class="form-label"><strong>${t('report_period_label')}</strong></label>
            <div class="report-radio-options">
              <label class="report-radio-label">
                <input type="radio" name="report-timeframe" value="1" ${appState.selectedTimeframe === 'daily' ? 'checked' : ''} />
                <span>${t('period_daily')}</span>
              </label>
              <label class="report-radio-label">
                <input type="radio" name="report-timeframe" value="7" ${appState.selectedTimeframe === 'weekly' ? 'checked' : ''} />
                <span>${t('period_weekly')}</span>
              </label>
              <label class="report-radio-label">
                <input type="radio" name="report-timeframe" value="30" ${appState.selectedTimeframe === 'monthly' ? 'checked' : ''} />
                <span>${t('period_monthly')}</span>
              </label>
            </div>
          </div>

          <div class="report-option-group" style="margin-top: 14px;">
            <label class="form-label"><strong>${t('report_lang_label')}</strong></label>
            <div class="report-radio-options">
              <label class="report-radio-label">
                <input type="radio" name="report-lang" value="bn" ${appState.language === 'bn' ? 'checked' : ''} />
                <span>বাংলা (Bengali)</span>
              </label>
              <label class="report-radio-label">
                <input type="radio" name="report-lang" value="en" ${appState.language === 'en' ? 'checked' : ''} />
                <span>English</span>
              </label>
            </div>
          </div>

          <div class="modal-actions" style="margin-top: 20px;">
            <button type="button" class="btn-secondary" id="close-report-btn">${t('cancel_btn')}</button>
            <button type="submit" class="btn-primary" id="start-generate-report-btn">${t('generate_pdf_btn')}</button>
          </div>
        </form>
      </div>
    </dialog>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  const data = getAppData();

  // Timeframe Switcher
  document.querySelectorAll<HTMLButtonElement>('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tf = (e.currentTarget as HTMLButtonElement).dataset.timeframe as 'daily' | 'weekly' | 'monthly';
      if (tf && tf !== appState.selectedTimeframe) {
        appState.selectedTimeframe = tf;
        renderApp();
      }
    });
  });

  // Profile Modal Backup & Restore
  document.getElementById('modal-export-data-btn')?.addEventListener('click', exportData);
  document.getElementById('modal-import-file')?.addEventListener('change', importData);
  document.getElementById('modal-pdf-report-btn')?.addEventListener('click', () => {
    profileModal?.close();
    openReportModal();
  });

  // Bottom Quick Navigation
  document.querySelectorAll('.bottom-nav-item[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetSelector = (e.currentTarget as HTMLElement).dataset.target;
      if (targetSelector) {
        const targetEl = document.querySelector(targetSelector);
        targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  document.getElementById('nav-profile-btn')?.addEventListener('click', () => {
    openProfileModal();
  });

  // Empty State Routing Button
  document.getElementById('empty-add-med-btn')?.addEventListener('click', () => {
    const form = document.getElementById('add-med-form');
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (document.getElementById('med-name') as HTMLInputElement)?.focus();
  });

  // Initialize Dose Times in Add Medicine Form
  const dosesSelect = document.getElementById('med-doses-per-day') as HTMLSelectElement;
  if (dosesSelect) {
    renderDoseTimeInputs(parseInt(dosesSelect.value, 10) || 1);
    dosesSelect.addEventListener('change', () => {
      const count = parseInt(dosesSelect.value, 10) || 1;
      renderDoseTimeInputs(count);
    });
  }

  // Medicine Form Submission
  const form = document.getElementById('add-med-form') as HTMLFormElement;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const frequency = (document.getElementById('med-frequency') as HTMLSelectElement).value as 'daily' | 'weekdays' | 'weekends';
    
    // Read all dose times
    const times: string[] = [];
    document.querySelectorAll<HTMLInputElement>('.med-dose-time').forEach(input => {
      if (input.value) times.push(input.value);
    });
    const dosesPerDay = times.length || 1;
    const primaryTime = times[0] || '09:00';

    addMedicine({
      name: (document.getElementById('med-name') as HTMLInputElement).value.trim(),
      dosage: (document.getElementById('med-dosage') as HTMLInputElement).value.trim(),
      time: primaryTime,
      times: times.length > 0 ? times : [primaryTime],
      dosesPerDay: dosesPerDay,
      taken: false,
      frequency: frequency,
      specificDays: [],
      inventory: parseInt((document.getElementById('med-inventory') as HTMLInputElement).value) || 30,
    });
    renderApp();
  });

  // Medicine Actions (Take, Skip, Undo, Refill & Delete) with multi-dose index support
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const id = target.dataset.id!;
      const doseIndex = parseInt(target.dataset.doseIndex || '0', 10);
      markMedicineTaken(id, doseIndex);
      showQuickToast(t('toast_med_success'), '✨');
      renderApp();
    });
  });

  document.querySelectorAll('.skip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const id = target.dataset.id!;
      const doseIndex = parseInt(target.dataset.doseIndex || '0', 10);
      markMedicineSkipped(id, doseIndex);
      renderApp();
    });
  });

  document.querySelectorAll('.undo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const id = target.dataset.id!;
      const doseIndex = parseInt(target.dataset.doseIndex || '0', 10);
      unmarkMedicine(id, doseIndex);
      renderApp();
    });
  });

  document.querySelectorAll('.refill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      refillMedicine(id, 30);
      alert(appState.language === 'bn' ? 'স্টক পুনরায় পূরণ করা হয়েছে (+৩০ ডোজ)! 💊' : 'Inventory restocked +30 doses! 💊');
      renderApp();
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      const confirmText = appState.language === 'bn' ? 'আপনার সময়সূচী থেকে এই ওষুধটি মুছতে চান?' : 'Delete this medicine from your schedule?';
      if (confirm(confirmText)) {
        deleteMedicine(id);
        renderApp();
      }
    });
  });

  // Appointment Delete
  document.querySelectorAll('.delete-appt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      const confirmText = appState.language === 'bn' ? 'এই অ্যাপয়েন্টমেন্টটি মুছতে চান?' : 'Delete this appointment?';
      if (confirm(confirmText)) {
        deleteAppointment(id);
        renderApp();
      }
    });
  });

  // Water Buttons
  document.getElementById('add-water-btn')?.addEventListener('click', () => {
    addWater(250);
    showQuickToast(t('toast_water_success'), '💧');
    renderApp();
  });

  document.getElementById('remove-water-btn')?.addEventListener('click', () => {
    const currentWater = getTodayWater();
    if (currentWater > 0) {
      addWater(-250);
      renderApp();
    }
  });

  // Mood Selection
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const moodValue = parseInt((e.currentTarget as HTMLButtonElement).dataset.mood!);
      appState.currentMood = moodValue;
      updateEmojiUI();
    });
  });

  // Symptom Selection
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const symptom = (e.currentTarget as HTMLButtonElement).dataset.symptom!;
      if (appState.currentSymptoms.includes(symptom)) {
        appState.currentSymptoms = appState.currentSymptoms.filter(s => s !== symptom);
      } else {
        appState.currentSymptoms.push(symptom);
      }
      updateSymptomUI();
    });
  });

  // Save Mood
  document.getElementById('save-mood-btn')?.addEventListener('click', () => {
    if (appState.currentMood === 0) {
      alert(appState.language === 'bn' ? "দয়া করে প্রথমে আপনার অনুভূতি নির্বাচন করুন!" : "Please select how you're feeling first!");
      return;
    }
    const notes = (document.getElementById('mood-notes') as HTMLTextAreaElement).value.trim();
    const today = getTodayDateString();
    
    saveMoodEntry({
      id: Date.now().toString(),
      date: today,
      mood: appState.currentMood,
      symptoms: appState.currentSymptoms,
      notes,
      createdAt: new Date().toISOString()
    });
    
    alert(appState.language === 'bn' ? "আজকের চেক-ইন সংরক্ষিত হয়েছে! 🎉" : "Check-in saved! 🎉");
    renderApp();
  });

  // Modal Controls
  const vitalsModal = document.getElementById('vitals-modal') as HTMLDialogElement;
  const sleepModal = document.getElementById('sleep-modal') as HTMLDialogElement;
  const apptModal = document.getElementById('appointment-modal') as HTMLDialogElement;
  const profileModal = document.getElementById('profile-modal') as HTMLDialogElement;
  const goalModal = document.getElementById('goal-modal') as HTMLDialogElement;
  const reportModal = document.getElementById('report-modal') as HTMLDialogElement;

  // Backdrop click to close modals
  [vitalsModal, sleepModal, apptModal, profileModal, goalModal, reportModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.close();
      }
    });
  });

  // PDF Report Modal Controls
  function openReportModal(defaultDays?: number) {
    const days = defaultDays || (appState.selectedTimeframe === 'daily' ? 1 : appState.selectedTimeframe === 'monthly' ? 30 : 7);
    const tfRadio = document.querySelector<HTMLInputElement>(`input[name="report-timeframe"][value="${days}"]`);
    if (tfRadio) tfRadio.checked = true;
    const langRadio = document.querySelector<HTMLInputElement>(`input[name="report-lang"][value="${appState.language}"]`);
    if (langRadio) langRadio.checked = true;
    reportModal?.showModal();
  }

  document.getElementById('open-report-from-trends-btn')?.addEventListener('click', () => {
    const defaultDays = appState.selectedTimeframe === 'daily' ? 1 : appState.selectedTimeframe === 'monthly' ? 30 : 7;
    openReportModal(defaultDays);
  });

  document.getElementById('close-report-x')?.addEventListener('click', () => {
    reportModal?.close();
  });

  document.getElementById('close-report-btn')?.addEventListener('click', () => {
    reportModal?.close();
  });

  document.getElementById('generate-report-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const tfInput = document.querySelector<HTMLInputElement>('input[name="report-timeframe"]:checked');
    const langInput = document.querySelector<HTMLInputElement>('input[name="report-lang"]:checked');
    const selectedDays = Number(tfInput?.value) || 30;
    const selectedLang = (langInput?.value as 'en' | 'bn') || appState.language;
    reportModal?.close();
    downloadPDFReport(getAppData(), selectedDays, selectedLang);
  });

  // Profile Modal Controls
  let stagedAvatarUrl = getUserProfile().avatarUrl;

  function openProfileModal() {
    const prof = getUserProfile();
    stagedAvatarUrl = prof.avatarUrl;
    const preview = document.getElementById('profile-avatar-preview');
    const firstName = prof.name?.trim() ? prof.name.trim().split(' ')[0] : '';
    if (preview) {
      preview.innerHTML = prof.avatarUrl 
        ? `<img src="${prof.avatarUrl}" alt="Profile avatar" />` 
        : `<span class="avatar-preview-fallback">${firstName ? escapeHtml(firstName[0].toUpperCase()) : '👤'}</span>`;
    }
    const removeBtn = document.getElementById('remove-avatar-btn');
    if (removeBtn) {
      removeBtn.style.display = prof.avatarUrl ? 'inline-block' : 'none';
    }
    profileModal?.showModal();
  }

  // Profile Modal: Preferences & Settings Controls
  document.getElementById('modal-toggle-lang-btn')?.addEventListener('click', () => {
    appState.language = appState.language === 'en' ? 'bn' : 'en';
    setAppLanguage(appState.language);
    setLanguage(appState.language);
    saveAppState();
    renderApp();
    openProfileModal();
  });

  document.getElementById('modal-toggle-notifications-btn')?.addEventListener('click', async () => {
    if (!appState.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        appState.notificationsEnabled = true;
        saveAppState();
        sendLocalNotification(
          appState.language === 'bn' ? 'নোটিফিকেশন সক্রিয় হয়েছে 🔔' : 'Notifications Active 🔔',
          appState.language === 'bn' ? 'মেডিট্র্যাক যথাসময়ে আপনার ওষুধ ও পানি পানের কথা মনে করিয়ে দেবে।' : 'MediTrack will remind you when it is time for your medication.'
        );
        renderApp();
        openProfileModal();
      } else {
        alert(appState.language === 'bn' 
          ? 'নোটিফিকেশন অনুমতি পাওয়া যায়নি। আপনার ব্রাউজার সেটিংস থেকে চালু করতে পারেন।' 
          : 'Notification permission was not granted. You can enable it in your browser settings.');
      }
    } else {
      appState.notificationsEnabled = false;
      saveAppState();
      renderApp();
      openProfileModal();
    }
  });

  document.getElementById('modal-toggle-theme-btn')?.addEventListener('click', () => {
    appState.isDarkMode = !appState.isDarkMode;
    document.documentElement.classList.toggle('dark-mode', appState.isDarkMode);
    saveAppState();
    renderApp();
    openProfileModal();
  });

  document.getElementById('bmi-update-metrics-btn')?.addEventListener('click', openProfileModal);

  document.getElementById('close-profile-btn')?.addEventListener('click', () => {
    profileModal?.close();
  });
  document.getElementById('close-profile-x')?.addEventListener('click', () => {
    profileModal?.close();
  });

  // Avatar Upload & Remove Handlers
  document.getElementById('avatar-file-input')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      alert(appState.language === 'bn' ? 'অনুগ্রহ করে ২.৫ মেগাবাইটের কম সাইজের ছবি দিন।' : 'Please choose an image smaller than 2.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      stagedAvatarUrl = event.target?.result as string;
      const preview = document.getElementById('profile-avatar-preview');
      if (preview) {
        preview.innerHTML = `<img src="${stagedAvatarUrl}" alt="Profile avatar" />`;
      }
      const removeBtn = document.getElementById('remove-avatar-btn');
      if (removeBtn) removeBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('remove-avatar-btn')?.addEventListener('click', () => {
    stagedAvatarUrl = '';
    const preview = document.getElementById('profile-avatar-preview');
    if (preview) {
      preview.innerHTML = `<span class="avatar-preview-fallback">👤</span>`;
    }
    const removeBtn = document.getElementById('remove-avatar-btn');
    if (removeBtn) removeBtn.style.display = 'none';
  });

  // Profile Form Submit
  document.getElementById('profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('profile-name') as HTMLInputElement).value.trim();
    const heightCm = Number((document.getElementById('profile-height') as HTMLInputElement).value) || 170;
    const weightKg = Number((document.getElementById('profile-weight') as HTMLInputElement).value) || 70;
    const bloodType = (document.getElementById('profile-blood-type') as HTMLSelectElement).value;
    const waterGoal = Number((document.getElementById('profile-water-goal') as HTMLInputElement).value) || 2000;
    const emName = (document.getElementById('profile-emergency-name') as HTMLInputElement).value.trim();
    const emPhone = (document.getElementById('profile-emergency-phone') as HTMLInputElement).value.trim();
    const emRel = (document.getElementById('profile-emergency-rel') as HTMLInputElement).value.trim();

    saveUserProfile({
      name,
      avatarUrl: stagedAvatarUrl,
      heightCm,
      weightKg,
      bloodType,
      emergencyContact: emName ? { name: emName, phone: emPhone, relationship: emRel } : undefined
    });

    setCustomHydrationGoal(waterGoal);
    profileModal?.close();
    renderApp();
  });

  // Water Goal Quick Modal
  document.getElementById('edit-water-goal-btn')?.addEventListener('click', () => {
    goalModal?.showModal();
  });

  document.getElementById('close-goal-btn')?.addEventListener('click', () => {
    goalModal?.close();
  });
  document.getElementById('close-goal-x')?.addEventListener('click', () => {
    goalModal?.close();
  });

  document.querySelectorAll('.goal-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ml = (e.currentTarget as HTMLButtonElement).dataset.ml!;
      const input = document.getElementById('quick-goal-input') as HTMLInputElement;
      if (input) input.value = ml;
    });
  });

  document.getElementById('quick-goal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetGoal = Number((document.getElementById('quick-goal-input') as HTMLInputElement).value) || 2000;
    setCustomHydrationGoal(targetGoal);
    goalModal?.close();
    renderApp();
  });

  // Vitals Modal
  document.getElementById('show-vitals-btn')?.addEventListener('click', () => {
    (document.getElementById('vitals-form') as HTMLFormElement)?.reset();
    vitalsModal?.showModal();
  });

  document.getElementById('close-vitals-btn')?.addEventListener('click', () => {
    vitalsModal?.close();
  });

  document.getElementById('vitals-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const hr = (document.getElementById('vitals-hr') as HTMLInputElement).value;
    const bp = (document.getElementById('vitals-bp') as HTMLInputElement).value.trim();
    const weight = (document.getElementById('vitals-weight') as HTMLInputElement).value;
    const temp = (document.getElementById('vitals-temp') as HTMLInputElement).value;
    
    let bloodPressure = undefined;
    if (bp && bp.includes('/')) {
      const [systolic, diastolic] = bp.split('/').map(Number);
      if (!isNaN(systolic) && !isNaN(diastolic)) {
        bloodPressure = { systolic, diastolic };
      }
    }
    
    addVitalsLog({
      heartRate: hr ? Number(hr) : undefined,
      bloodPressure,
      weight: weight ? Number(weight) : undefined,
      temperature: temp ? Number(temp) : undefined
    });
    
    vitalsModal?.close();
    renderApp();
  });

  // Sleep Modal
  document.getElementById('show-sleep-btn')?.addEventListener('click', () => {
    sleepModal?.showModal();
  });

  document.getElementById('close-sleep-btn')?.addEventListener('click', () => {
    sleepModal?.close();
  });

  document.getElementById('sleep-quality')?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    const display = document.getElementById('quality-display');
    if (display) display.textContent = val;
  });

  document.getElementById('sleep-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const bedtime = (document.getElementById('sleep-bedtime') as HTMLInputElement).value;
    const wakeTime = (document.getElementById('sleep-waketime') as HTMLInputElement).value;
    const quality = parseInt((document.getElementById('sleep-quality') as HTMLInputElement).value);
    
    addSleepLog({
      bedtime,
      wakeTime,
      quality
    });
    
    sleepModal?.close();
    renderApp();
  });

  // Appointment Modal
  document.getElementById('show-appointment-btn')?.addEventListener('click', () => {
    (document.getElementById('appointment-form') as HTMLFormElement)?.reset();
    (document.getElementById('appt-date') as HTMLInputElement).value = getTodayDateString();
    apptModal?.showModal();
  });

  document.getElementById('close-appt-btn')?.addEventListener('click', () => {
    apptModal?.close();
  });

  document.getElementById('appointment-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = (document.getElementById('appt-title') as HTMLInputElement).value.trim();
    const doctor = (document.getElementById('appt-doctor') as HTMLInputElement).value.trim();
    const date = (document.getElementById('appt-date') as HTMLInputElement).value;
    const time = (document.getElementById('appt-time') as HTMLInputElement).value;
    const location = (document.getElementById('appt-location') as HTMLInputElement).value.trim();
    
    addAppointment({
      title,
      doctor,
      date,
      time,
      location,
      completed: false
    });
    
    apptModal?.close();
    renderApp();
  });
}

// Helpers: Update UI without full re-render
function updateEmojiUI() {
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    const moodVal = parseInt(btn.getAttribute('data-mood')!);
    btn.classList.toggle('selected', moodVal === appState.currentMood);
  });
}

function updateSymptomUI() {
  const symptomsMap: Record<string, string> = {
    'Headache': t('symptom_headache'),
    'Fatigue': t('symptom_fatigue'),
    'Nausea': t('symptom_nausea'),
    'Pain': t('symptom_pain'),
    'Anxiety': t('symptom_anxiety'),
    'Dizziness': t('symptom_dizziness'),
    'Stress': t('symptom_stress'),
    'Insomnia': t('symptom_insomnia'),
  };
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    const symptom = btn.getAttribute('data-symptom')!;
    const isSelected = appState.currentSymptoms.includes(symptom);
    btn.classList.toggle('selected', isSelected);
    const label = symptomsMap[symptom] || symptom;
    btn.innerHTML = `${isSelected ? '✓ ' : ''}${label}`;
  });
}

// Helper: Calculate streak
function calculateStreak(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0;
  
  const dateSet = new Set(entries.map(e => e.date));
  const sortedDates = Array.from(dateSet).sort().reverse();
  
  const today = getTodayDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  let currentCheckingDate: Date;
  if (sortedDates.includes(today)) {
    currentCheckingDate = new Date();
  } else if (sortedDates.includes(yesterday)) {
    currentCheckingDate = yesterdayDate;
  } else {
    return 0;
  }

  let streak = 0;
  while (true) {
    const dateStr = currentCheckingDate.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      streak++;
      currentCheckingDate.setDate(currentCheckingDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Export Data Function
function exportData() {
  const jsonStr = exportAllData();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meditrack-backup-${getTodayDateString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import Data Function
function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (importAllData(content)) {
      alert(appState.language === 'bn' ? 'ডাটা সফলভাবে ইমপোর্ট করা হয়েছে! 🎉' : 'Data imported successfully! 🎉');
      renderApp();
    } else {
      alert(appState.language === 'bn' ? 'ডাটা ইমপোর্ট করতে সমস্যা হয়েছে। অনুগ্রহ করে ফাইল ফরম্যাট যাচাই করুন।' : 'Error importing data. Please check the file format.');
    }
  };
  reader.readAsText(file);
}

// Initialize
loadAppState();
renderApp();