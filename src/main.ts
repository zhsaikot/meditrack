// src/main.ts
import './style.css'
import { Medicine, MoodEntry, VitalsLog, SleepLog, Appointment } from './types'
import { 
  getMedicines, 
  addMedicine, 
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
  setCustomHydrationGoal
} from './storage'
import { calculateBMI, renderBMISpectrumSVG } from './modules/profile'
import { initVitalsModule, addVitalsLog, getLatestVitals, getVitalsAverages } from './modules/vitals'
import { initSleepModule, addSleepLog, getLatestSleep, getSleepAverage } from './modules/sleep'
import { initJournalModule, getMoodAverage } from './modules/journal'
import { initHydrationModule, getHydrationGoal, setHydrationGoal } from './modules/hydration'
import { 
  initMedicineModule, 
  getTodayMedicineList, 
  markMedicineTaken, 
  markMedicineSkipped, 
  unmarkMedicine, 
  getTodaysProgress,
  refillMedicine,
  getLowInventoryMedicines
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
  sendLocalNotification
} from './modules/notifications'
import { 
  getMilestones, 
  renderHydrationChartSVG, 
  renderMoodSleepChartSVG, 
  calculateCorrelationInsight 
} from './modules/trends'
import { printDoctorReport } from './modules/report'

const app = document.querySelector<HTMLDivElement>('#app')!;

// App State
let appState = {
  currentMood: 0,
  currentSymptoms: [] as string[],
  isDarkMode: false,
  notificationsEnabled: false
};

// Load saved state
function loadAppState() {
  const data = getAppData();
  appState.isDarkMode = data.settings.theme === 'dark';
  appState.notificationsEnabled = data.settings.notificationsEnabled || false;

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
    startReminderScheduler(() => {
      const list = getTodayMedicineList();
      return list
        .filter(({ log }) => !log?.taken && !log?.skipped)
        .map(({ medicine }) => ({
          name: medicine.name,
          dosage: medicine.dosage,
          time: medicine.time
        }));
    });
  }
}

function saveAppState() {
  const data = getAppData();
  data.settings.theme = appState.isDarkMode ? 'dark' : 'light';
  data.settings.notificationsEnabled = appState.notificationsEnabled;
  saveAppData(data);
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
    .sort((a, b) => a.medicine.time.localeCompare(b.medicine.time))[0];
  const latestMood = moodEntries[0];
  const todayLabel = new Intl.DateTimeFormat('en-US', {
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

  const medicineListHTML = todaysMedList.map(({ medicine, log }) => `
    <div class="medicine-item ${log?.taken ? 'taken' : log?.skipped ? 'skipped' : ''}">
      <div class="med-info">
        <div class="med-title-row">
          <strong>${escapeHtml(medicine.name)}</strong>
          <span class="dosage">(${escapeHtml(medicine.dosage)})</span>
        </div>
        <div class="time">🕐 ${formatTime(medicine.time)}${nextMedicine?.medicine.id === medicine.id && !log?.taken && !log?.skipped ? ' · <span class="next-tag">Next Up</span>' : ''}</div>
        ${medicine.inventory <= 5 ? `
          <div class="low-stock">
            <span>⚠️ Low supply: ${medicine.inventory} dose${medicine.inventory === 1 ? '' : 's'} left</span>
            <button class="refill-btn" data-id="${medicine.id}" title="Restock 30 doses">+30 Refill</button>
          </div>
        ` : ''}
      </div>
      <div class="med-actions">
        ${!log?.taken && !log?.skipped ? `
          <button class="action-btn take-btn" data-id="${medicine.id}" title="Mark as taken" aria-label="Mark as taken">✓</button>
          <button class="action-btn skip-btn" data-id="${medicine.id}" title="Skip today" aria-label="Skip today">⊘</button>
        ` : `
          <button class="action-btn undo-btn" data-id="${medicine.id}" title="Undo" aria-label="Undo">↩</button>
        `}
        <button class="delete-btn" data-id="${medicine.id}" title="Delete medicine" aria-label="Delete medicine">🗑️</button>
      </div>
    </div>
  `).join('');

  const appointmentListHTML = upcomingAppts.map(appt => {
    const display = formatAppointmentDisplay(appt);
    return `
      <div class="appointment-item">
        <div class="appt-info">
          <div class="appt-title-row">
            <strong>${escapeHtml(appt.title)}</strong>
            <span class="appt-doctor">with ${escapeHtml(appt.doctor)}</span>
          </div>
          <div class="appt-meta">📅 ${display.dateDisplay} at ${display.timeDisplay} ${appt.location ? `· 📍 ${escapeHtml(appt.location)}` : ''}</div>
        </div>
        <div class="appt-actions">
          <span class="countdown-badge">${display.countdown}</span>
          <button class="delete-appt-btn" data-id="${appt.id}" title="Delete appointment" aria-label="Delete appointment">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  const moodEmojis = [
    { val: 1, icon: '😫', label: 'Terrible' },
    { val: 2, icon: '😕', label: 'Bad' },
    { val: 3, icon: '😐', label: 'Okay' },
    { val: 4, icon: '🙂', label: 'Good' },
    { val: 5, icon: '😄', label: 'Great' }
  ];

  const symptomsList = ['Headache', 'Fatigue', 'Nausea', 'Pain', 'Anxiety', 'Dizziness', 'Stress', 'Insomnia'];
  const todayMood = getTodayMood();
  const notesValue = todayMood ? todayMood.notes : '';

  const profile = getUserProfile();
  const userWeight = latestVitals?.weight || profile.weightKg || 70;
  const userHeight = profile.heightCm || 170;
  const bmiResult = calculateBMI(userWeight, userHeight);
  const firstName = profile.name?.trim() ? profile.name.trim().split(' ')[0] : '';
  const greetingEyebrow = firstName ? `GOOD TO SEE YOU, ${escapeHtml(firstName.toUpperCase())}` : 'GOOD TO SEE YOU';

  app.innerHTML = `
    <div class="container">
      <header class="main-header">
        <div class="brand-lockup">
          <div class="brand-mark">✚</div>
          <div>
            <p class="eyebrow">PERSONAL HEALTH DASHBOARD</p>
            <h1>MediTrack</h1>
            <p class="subtitle">Your complete, private health companion</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="profile-avatar-btn" id="open-profile-btn" title="Open Profile & Settings" aria-label="Open Profile & Settings">
            ${profile.avatarUrl ? `
              <img src="${profile.avatarUrl}" alt="${escapeHtml(profile.name || 'User')}" class="profile-avatar-img" />
            ` : `
              <span class="profile-avatar-fallback">${firstName ? escapeHtml(firstName[0]) : '👤'}</span>
            `}
          </button>
          <button class="icon-btn ${appState.notificationsEnabled ? 'notification-bell active' : 'notification-bell'}" id="toggle-notifications-btn" title="${appState.notificationsEnabled ? 'Reminders Active' : 'Enable Reminders'}">
            ${appState.notificationsEnabled ? '🔔' : '🔕'}
          </button>
          <button class="icon-btn" id="doctor-report-btn" title="Print Doctor Health Report">📋</button>
          <button class="icon-btn" id="toggle-theme-btn" title="Toggle Dark Mode">
            ${appState.isDarkMode ? '☀️' : '🌙'}
          </button>
          <button class="icon-btn" id="export-data-btn" title="Export Backup (JSON)">💾</button>
          <label class="icon-btn" for="import-file" title="Import Backup (JSON)">📁</label>
          <input type="file" id="import-file" accept=".json" style="display:none" />
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
          <h2>${firstName ? `Welcome back, ${escapeHtml(firstName)}.` : 'Take the day one small step at a time.'}</h2>
          <p>${nextMedicine ? `Next up: <strong>${escapeHtml(nextMedicine.medicine.name)}</strong> at ${formatTime(nextMedicine.medicine.time)}.` : 'Your medication schedule is clear for today.'}${nextAppt ? `<br>📅 <strong>${escapeHtml(nextAppt.title)}</strong> with ${escapeHtml(nextAppt.doctor)} (${formatAppointmentDisplay(nextAppt).countdown})` : ''}</p>
        </div>
        <div class="welcome-orbit" aria-hidden="true"><span>✦</span></div>
      </section>

      <!-- Statistics Card with Gamified Milestones -->
      <section class="card stats-card">
        <div class="section-heading light-heading">
          <div><p class="eyebrow">AT A GLANCE</p><h2>Today's overview</h2></div>
          <span class="section-kicker">LIVE</span>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${adherenceRate}%</div>
            <div class="stat-label">Medicine Adherence</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${waterAmount}ml</div>
            <div class="stat-label">Water Intake</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${sleepAvg.avgDuration !== null ? sleepAvg.avgDuration + 'h' : '--'}</div>
            <div class="stat-label">Avg Sleep</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${streakDays} days</div>
            <div class="stat-label">Check-in Streak</div>
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
          <div><p class="eyebrow">QUICK LOG</p><h2>Record vitals, sleep & visits</h2></div>
        </div>
        <div class="quick-grid">
          <button class="quick-btn" id="show-vitals-btn">❤️ Log Vitals</button>
          <button class="quick-btn" id="show-sleep-btn">😴 Log Sleep</button>
          <button class="quick-btn" id="show-appointment-btn">📅 Add Visit</button>
        </div>
      </section>

      <!-- Harmonized Hydration Tracker -->
      <section class="card water-card">
        <div class="section-heading">
          <div><p class="eyebrow">BODY RHYTHM</p><h2>Hydration</h2></div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="goal-setting-btn" id="edit-water-goal-btn" title="Customize daily water goal">⚙️ ${hydrationGoal}ml Goal</button>
            <span class="water-icon">💧</span>
          </div>
        </div>
        <p class="card-intro">Small sips add up. You are ${waterAmount >= hydrationGoal ? 'at your daily goal! 🎉' : `${hydrationGoal - waterAmount}ml from your goal`}.</p>
        <div class="water-progress">
          <div class="progress-bar" style="width: ${waterProgress}%"></div>
        </div>
        <div class="water-stats">
          <span>${waterAmount}ml / ${hydrationGoal}ml</span>
          <span>${Math.round(waterProgress)}%</span>
        </div>
        <div class="water-actions">
          <button class="btn-water secondary-water" id="remove-water-btn" aria-label="Remove 250ml">−</button>
          <button class="btn-water" id="add-water-btn">Add 250ml <span>+</span></button>
        </div>
      </section>

      <!-- Body Mass Index (BMI) & Biometrics Card -->
      <section class="card bmi-card">
        <div class="section-heading">
          <div><p class="eyebrow" style="color: ${bmiResult.color}">BODY COMPOSITION</p><h2>Body Mass Index (BMI)</h2></div>
          <span class="bmi-badge" style="background: ${bmiResult.badgeBg}; color: ${bmiResult.color}">● ${bmiResult.category}</span>
        </div>
        
        <div class="bmi-grid">
          <div class="bmi-stat-box">
            <span class="bmi-stat-label">Current BMI</span>
            <span class="bmi-stat-num" style="color: ${bmiResult.color}">${bmiResult.bmi || '--'}</span>
            <span class="bmi-stat-sub">Target: 18.5 – 24.9</span>
          </div>
          <div class="bmi-stat-box">
            <span class="bmi-stat-label">Recorded Weight</span>
            <span class="bmi-stat-num">${userWeight} <span style="font-size:0.9rem; font-weight:600;">kg</span></span>
            <span class="bmi-stat-sub">Height: ${userHeight} cm</span>
          </div>
          <div class="bmi-stat-box">
            <span class="bmi-stat-label">Healthy Weight Range</span>
            <span class="bmi-stat-num" style="font-size: 1.25rem;">${bmiResult.minHealthyWeight}–${bmiResult.maxHealthyWeight} <span style="font-size:0.85rem; font-weight:600;">kg</span></span>
            <span class="bmi-stat-sub">WHO standard scale</span>
          </div>
        </div>

        ${renderBMISpectrumSVG(bmiResult.bmi)}

        <div class="bmi-advice-box">
          <span>💡 ${escapeHtml(bmiResult.advice)}</span>
          <button class="bmi-edit-link" id="bmi-update-metrics-btn">Edit Profile</button>
        </div>
      </section>

      <!-- Mood & Symptom Journal -->
      <section class="card mood-card">
        <div class="section-heading">
          <div><p class="eyebrow">MENTAL CHECK-IN</p><h2>How are you feeling?</h2></div>
          <span class="section-icon">☼</span>
        </div>
        <p class="mood-prompt">Rate your mood today:</p>
        <div class="emoji-grid">
          ${moodEmojis.map(e => `
            <button class="emoji-btn ${appState.currentMood === e.val ? 'selected' : ''}" data-mood="${e.val}">
              <span class="emoji-icon">${e.icon}</span>
              <span class="emoji-label">${e.label}</span>
            </button>
          `).join('')}
        </div>

        <p class="mood-prompt">Any symptoms?</p>
        <div class="symptom-grid">
          ${symptomsList.map(s => {
            const isSelected = appState.currentSymptoms.includes(s);
            return `
              <button class="symptom-btn ${isSelected ? 'selected' : ''}" data-symptom="${s}">
                ${isSelected ? '✓ ' : ''}${s}
              </button>
            `;
          }).join('')}
        </div>

        <textarea id="mood-notes" placeholder="Add journal notes or how you're feeling..." rows="3">${escapeHtml(notesValue)}</textarea>
        <button class="btn-primary" id="save-mood-btn">Save today's check-in <span>→</span></button>
      </section>

      <!-- Weekly Trends & Correlations -->
      <section class="card trends-card">
        <div class="section-heading">
          <div><p class="eyebrow">WEEKLY REVIEW</p><h2>Behavioral Trends</h2></div>
          <span class="section-icon">📈</span>
        </div>

        <div class="trend-chart-container">
          <div class="trend-chart-header">
            <span>Hydration vs Goal (Last 7 Days)</span>
            <span class="trend-legend"><span class="legend-item"><span class="legend-color" style="background:#0D9488"></span> Goal Met</span></span>
          </div>
          ${renderHydrationChartSVG(data.hydrationLogs, hydrationGoal)}
        </div>

        <div class="trend-chart-container">
          <div class="trend-chart-header">
            <span>Mood & Sleep Duration</span>
            <div class="trend-legend">
              <span class="legend-item"><span class="legend-color" style="background:#8B5CF6"></span> Mood (1-5★)</span>
              <span class="legend-item"><span class="legend-color" style="background:#3B82F6"></span> Sleep (hrs)</span>
            </div>
          </div>
          ${renderMoodSleepChartSVG(data.moodEntries, data.sleepLogs)}
        </div>

        <div class="correlation-box">
          ${correlationInsight}
        </div>
      </section>

      <!-- Latest Vitals Display -->
      ${latestVitals ? `
      <section class="card vitals-display">
        <div class="section-heading">
          <div><p class="eyebrow">LATEST VITALS</p><h2>Recent readings</h2></div>
          <span class="section-icon">❤️</span>
        </div>
        <div class="vitals-grid">
          ${latestVitals.heartRate ? `<div class="vital-item"><span class="vital-label">Heart Rate</span><span class="vital-value">${latestVitals.heartRate} bpm</span></div>` : ''}
          ${latestVitals.bloodPressure ? `<div class="vital-item"><span class="vital-label">Blood Pressure</span><span class="vital-value">${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic} mmHg</span></div>` : ''}
          ${latestVitals.weight ? `<div class="vital-item"><span class="vital-label">Weight</span><span class="vital-value">${latestVitals.weight} kg</span></div>` : ''}
          ${latestVitals.temperature ? `<div class="vital-item"><span class="vital-label">Temperature</span><span class="vital-value">${latestVitals.temperature}°C</span></div>` : ''}
        </div>
      </section>
      ` : ''}

      <!-- Latest Sleep Display -->
      ${latestSleep ? `
      <section class="card sleep-display">
        <div class="section-heading">
          <div><p class="eyebrow">LAST NIGHT'S SLEEP</p><h2>Sleep summary</h2></div>
          <span class="section-icon">🌙</span>
        </div>
        <div class="sleep-summary">
          <div class="sleep-stat"><span class="sleep-value">${latestSleep.duration}h</span><span class="sleep-label">Duration</span></div>
          <div class="sleep-stat"><span class="sleep-value">${'⭐'.repeat(latestSleep.quality)}${'☆'.repeat(5 - latestSleep.quality)}</span><span class="sleep-label">Quality</span></div>
          <div class="sleep-stat"><span class="sleep-value">${formatTime(latestSleep.bedtime)} - ${formatTime(latestSleep.wakeTime)}</span><span class="sleep-label">Schedule</span></div>
        </div>
      </section>
      ` : ''}

      <section class="insight-row">
        <div class="card insight-card">
          <p class="eyebrow">RECENT NOTE</p>
          <h3>${latestMood ? `${escapeHtml(latestMood.notes) || 'Checked in today.'}` : 'Your journal is ready when you are.'}</h3>
          <p class="muted-copy">${latestMood ? `${latestMood.symptoms.length ? latestMood.symptoms.map(escapeHtml).join(' · ') : 'No symptoms logged'} · Mood ${latestMood.mood}/5` : 'A short check-in helps spot patterns over time.'}</p>
        </div>
        <div class="card insight-card accent-insight">
          <p class="eyebrow">TODAY'S FOCUS</p>
          <h3>${medProgress.total === 0 ? 'Build your routine' : adherenceRate === 100 ? 'All medicines taken! ✨' : `${medProgress.total - medProgress.taken} medicine${medProgress.total - medProgress.taken === 1 ? '' : 's'} remaining`}</h3>
          <p class="muted-copy">${streakDays > 1 ? `${streakDays} days of consistent check-ins.` : 'Consistency starts with one step.'}</p>
        </div>
      </section>

      <!-- Medicine Section -->
      <section class="card add-med-card">
        <div class="section-heading">
          <div><p class="eyebrow">YOUR ROUTINE</p><h2>Add a medicine</h2></div>
          <span class="section-icon">＋</span>
        </div>
        <form id="add-med-form">
          <input type="text" id="med-name" placeholder="Medicine Name (e.g., Metformin)" required />
          <input type="text" id="med-dosage" placeholder="Dosage (e.g., 500mg)" required />
          <label class="form-label">Dose Time: <input type="time" id="med-time" required value="09:00" /></label>
          <div class="form-row">
            <label class="form-label">Frequency:
              <select id="med-frequency">
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays only</option>
                <option value="weekends">Weekends only</option>
              </select>
            </label>
            <label class="form-label">Initial Supply:
              <input type="number" id="med-inventory" placeholder="Pills left" min="0" value="30" />
            </label>
          </div>
          <button type="submit" class="btn-primary">Add Medicine</button>
        </form>
      </section>

      <!-- Medicine Schedule Card with Empty State Routing -->
      <section class="card list-card" id="medicine-schedule-section">
        <div class="section-heading">
          <div><p class="eyebrow">SCHEDULE</p><h2>Today's medicines</h2></div>
          <span class="progress-pill">${medProgress.taken} / ${medProgress.total} taken</span>
        </div>

        ${lowInventoryMeds.length > 0 ? `
          <div class="refill-alert-banner">
            <span>⚠️ Refill Alert: <strong>${lowInventoryMeds.length} medication${lowInventoryMeds.length > 1 ? 's have' : ' has'}</strong> 5 or fewer doses remaining.</span>
          </div>
        ` : ''}

        <div id="medicine-list">
          ${todaysMedList.length === 0 ? `
            <div class="empty-state-box">
              <div class="empty-state-icon">💊</div>
              <h3 class="empty-state-title">No medicines scheduled for today</h3>
              <p class="empty-state-desc">Stay on track with your prescription regimen. Add your daily medications or vitamins to get started.</p>
              <button class="empty-state-btn" id="empty-add-med-btn">＋ Add Your First Medicine</button>
            </div>
          ` : medicineListHTML}
        </div>
      </section>

      <!-- Appointments List Section -->
      <section class="card appointments-card">
        <div class="section-heading">
          <div><p class="eyebrow">CONSULTATIONS</p><h2>Upcoming Appointments</h2></div>
          <span class="progress-pill">${upcomingAppts.length} scheduled</span>
        </div>
        <div id="appointments-list">
          ${upcomingAppts.length === 0 ? '<p class="empty-state">No upcoming appointments. Click "Add Visit" above to schedule one.</p>' : appointmentListHTML}
        </div>
      </section>

      <!-- App Footer -->
      <footer class="app-footer">
        <p class="copyright-text">Created by <a href="https://www.instagram.com/zhsaikot" target="_blank" rel="noopener noreferrer" class="creator-link">MD. Ziaul Hasan</a></p>
      </footer>
    </div>
    
    <!-- Vitals Modal -->
    <dialog id="vitals-modal" class="modal">
      <div class="modal-content">
        <h3>Record Vital Signs</h3>
        <form id="vitals-form">
          <label>Heart Rate (bpm)<input type="number" id="vitals-hr" placeholder="e.g., 72" min="30" max="250" /></label>
          <label>Blood Pressure (Systolic/Diastolic)<input type="text" id="vitals-bp" placeholder="e.g., 120/80" pattern="\\d{2,3}/\\d{2,3}" title="Format: 120/80" /></label>
          <label>Weight (kg)<input type="number" id="vitals-weight" step="0.1" placeholder="e.g., 70.5" min="1" max="500" /></label>
          <label>Temperature (°C)<input type="number" id="vitals-temp" step="0.1" placeholder="e.g., 36.6" min="30" max="45" /></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-vitals-btn">Cancel</button>
            <button type="submit" class="btn-primary">Save Vitals</button>
          </div>
        </form>
      </div>
    </dialog>
    
    <!-- Sleep Modal -->
    <dialog id="sleep-modal" class="modal">
      <div class="modal-content">
        <h3>Log Sleep</h3>
        <form id="sleep-form">
          <label>Bedtime<input type="time" id="sleep-bedtime" value="23:00" required /></label>
          <label>Wake Time<input type="time" id="sleep-waketime" value="07:00" required /></label>
          <label>Sleep Quality (1-5): <span id="quality-display">3</span> Stars
            <input type="range" id="sleep-quality" min="1" max="5" value="3" />
          </label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-sleep-btn">Cancel</button>
            <button type="submit" class="btn-primary">Save Sleep</button>
          </div>
        </form>
      </div>
    </dialog>
    
    <!-- Appointment Modal -->
    <dialog id="appointment-modal" class="modal">
      <div class="modal-content">
        <h3>Add Appointment</h3>
        <form id="appointment-form">
          <label>Title<input type="text" id="appt-title" placeholder="e.g., Annual Check-up" required /></label>
          <label>Doctor / Specialist<input type="text" id="appt-doctor" placeholder="e.g., Dr. Smith" required /></label>
          <label>Date<input type="date" id="appt-date" value="${getTodayDateString()}" required /></label>
          <label>Time<input type="time" id="appt-time" value="10:00" required /></label>
          <label>Location / Clinic<input type="text" id="appt-location" placeholder="e.g., General Hospital, Rm 302" /></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-appt-btn">Cancel</button>
            <button type="submit" class="btn-primary">Add Appointment</button>
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
                  📷 ${profile.avatarUrl ? 'Change' : 'Upload'} Photo
                </label>
                <input type="file" id="avatar-file-input" accept="image/*" style="display:none;" />
                <button type="button" class="avatar-remove-btn" id="remove-avatar-btn" style="${profile.avatarUrl ? '' : 'display:none;'}">Remove</button>
              </div>
              <span class="avatar-hint">Stored offline in browser</span>
            </div>
          </div>

          <div class="profile-title-and-close">
            <h3 class="profile-modal-heading">Profile & Health Baseline</h3>
            <button type="button" class="modal-close-icon" id="close-profile-x" aria-label="Close modal">✕</button>
          </div>
        </div>

        <form id="profile-form">
          <!-- 3-Column Balanced Biometrics Grid -->
          <div class="profile-fields-grid">
            <div class="field-fullname">
              <label class="form-label" for="profile-name">Full Name</label>
              <input type="text" id="profile-name" placeholder="e.g. Alex Morgan" value="${escapeHtml(profile.name || '')}" />
            </div>

            <div class="field-blood">
              <label class="form-label" for="profile-blood-type">Blood Type</label>
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
              <label class="form-label" for="profile-height">Height (cm)</label>
              <input type="number" id="profile-height" placeholder="170" min="50" max="260" required value="${profile.heightCm || 170}" />
            </div>

            <div class="field-weight">
              <label class="form-label" for="profile-weight">Weight (kg)</label>
              <input type="number" id="profile-weight" step="0.1" placeholder="70.0" min="20" max="400" required value="${profile.weightKg || 70}" />
            </div>

            <div class="field-water">
              <label class="form-label" for="profile-water-goal">Water Goal (ml)</label>
              <input type="number" id="profile-water-goal" placeholder="2000" min="500" max="8000" step="50" required value="${hydrationGoal}" />
            </div>
          </div>

          <!-- Section 2: Compact Emergency Contact Strip -->
          <div class="emergency-contact-fieldset">
            <div class="profile-section-legend">Emergency Contact (Optional)</div>
            <div class="emergency-fields-grid">
              <div class="field-em-name">
                <label class="form-label" for="profile-emergency-name">Contact Name</label>
                <input type="text" id="profile-emergency-name" placeholder="e.g. Jane Doe" value="${escapeHtml(profile.emergencyContact?.name || '')}" />
              </div>

              <div class="field-em-phone">
                <label class="form-label" for="profile-emergency-phone">Phone Number</label>
                <input type="tel" id="profile-emergency-phone" placeholder="e.g. +1 555-0199" value="${escapeHtml(profile.emergencyContact?.phone || '')}" />
              </div>

              <div class="field-em-rel">
                <label class="form-label" for="profile-emergency-rel">Relationship</label>
                <input type="text" id="profile-emergency-rel" placeholder="e.g. Spouse, Parent" value="${escapeHtml(profile.emergencyContact?.relationship || '')}" />
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="profile-modal-actions">
            <button type="button" class="btn-secondary" id="close-profile-btn">Cancel</button>
            <button type="submit" class="btn-primary">Save Profile</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- Quick Water Goal Modal -->
    <dialog id="goal-modal" class="modal">
      <div class="modal-content goal-modal-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <h3 style="margin:0;">Daily Water Goal</h3>
          <button type="button" class="icon-btn" id="close-goal-x" style="border:none; width:30px; height:30px; font-size:1.1rem; cursor:pointer;">✕</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">
          Adjust your target daily hydration. The recommended baseline is 2000ml – 3000ml.
        </p>
        <form id="quick-goal-form">
          <label class="form-label">Daily Target (ml)
            <input type="number" id="quick-goal-input" min="500" max="8000" step="50" value="${hydrationGoal}" required />
          </label>
          <div style="display:flex; gap:8px; margin: 12px 0;">
            <button type="button" class="goal-preset-btn" data-ml="1500" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">1500ml</button>
            <button type="button" class="goal-preset-btn" data-ml="2000" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">2000ml</button>
            <button type="button" class="goal-preset-btn" data-ml="2500" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">2500ml</button>
            <button type="button" class="goal-preset-btn" data-ml="3000" style="flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-primary); cursor:pointer; font-size:0.8rem; font-weight:600; color:var(--text-main);">3000ml</button>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-goal-btn">Cancel</button>
            <button type="submit" class="btn-primary">Save Goal</button>
          </div>
        </form>
      </div>
    </dialog>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  const data = getAppData();

  // Notification Bell Toggle
  document.getElementById('toggle-notifications-btn')?.addEventListener('click', async () => {
    if (!appState.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        appState.notificationsEnabled = true;
        saveAppState();
        sendLocalNotification('Notifications Active 🔔', 'MediTrack will remind you when it is time for your medication.');
        renderApp();
      } else {
        alert('Notification permission was not granted. You can enable it in your browser settings.');
      }
    } else {
      appState.notificationsEnabled = false;
      saveAppState();
      renderApp();
    }
  });

  // Doctor Report Trigger
  document.getElementById('doctor-report-btn')?.addEventListener('click', () => {
    printDoctorReport(data);
  });

  // Theme Toggle
  document.getElementById('toggle-theme-btn')?.addEventListener('click', () => {
    appState.isDarkMode = !appState.isDarkMode;
    document.documentElement.classList.toggle('dark-mode', appState.isDarkMode);
    saveAppState();
    renderApp();
  });

  // Export Data
  document.getElementById('export-data-btn')?.addEventListener('click', exportData);

  // Import Data
  document.getElementById('import-file')?.addEventListener('change', importData);

  // Empty State Routing Button
  document.getElementById('empty-add-med-btn')?.addEventListener('click', () => {
    const form = document.getElementById('add-med-form');
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (document.getElementById('med-name') as HTMLInputElement)?.focus();
  });

  // Medicine Form
  const form = document.getElementById('add-med-form') as HTMLFormElement;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const frequency = (document.getElementById('med-frequency') as HTMLSelectElement).value as 'daily' | 'weekdays' | 'weekends';
    addMedicine({
      id: Date.now().toString(),
      name: (document.getElementById('med-name') as HTMLInputElement).value.trim(),
      dosage: (document.getElementById('med-dosage') as HTMLInputElement).value.trim(),
      time: (document.getElementById('med-time') as HTMLInputElement).value,
      taken: false,
      frequency: frequency,
      specificDays: [],
      inventory: parseInt((document.getElementById('med-inventory') as HTMLInputElement).value) || 30,
      createdAt: new Date().toISOString()
    });
    renderApp();
  });

  // Medicine Actions (Take, Skip, Undo, Refill & Delete)
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      markMedicineTaken(id);
      renderApp();
    });
  });

  document.querySelectorAll('.skip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      markMedicineSkipped(id);
      renderApp();
    });
  });

  document.querySelectorAll('.undo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      unmarkMedicine(id);
      renderApp();
    });
  });

  document.querySelectorAll('.refill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      refillMedicine(id, 30);
      alert('Inventory restocked +30 doses! 💊');
      renderApp();
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      if (confirm('Delete this medicine from your schedule?')) {
        deleteMedicine(id);
        renderApp();
      }
    });
  });

  // Appointment Delete
  document.querySelectorAll('.delete-appt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      if (confirm('Delete this appointment?')) {
        deleteAppointment(id);
        renderApp();
      }
    });
  });

  // Water Buttons
  document.getElementById('add-water-btn')?.addEventListener('click', () => {
    addWater(250);
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
      alert("Please select how you're feeling first!");
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
    
    alert("Check-in saved! 🎉");
    renderApp();
  });

  // Modal Controls
  const vitalsModal = document.getElementById('vitals-modal') as HTMLDialogElement;
  const sleepModal = document.getElementById('sleep-modal') as HTMLDialogElement;
  const apptModal = document.getElementById('appointment-modal') as HTMLDialogElement;
  const profileModal = document.getElementById('profile-modal') as HTMLDialogElement;
  const goalModal = document.getElementById('goal-modal') as HTMLDialogElement;

  // Backdrop click to close modals
  [vitalsModal, sleepModal, apptModal, profileModal, goalModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.close();
      }
    });
  });

  // Profile Modal Controls
  let stagedAvatarUrl = getUserProfile().avatarUrl;

  const openProfileModal = () => {
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
  };

  document.getElementById('open-profile-btn')?.addEventListener('click', openProfileModal);
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
      alert('Please choose an image smaller than 2.5MB.');
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
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    const symptom = btn.getAttribute('data-symptom')!;
    const isSelected = appState.currentSymptoms.includes(symptom);
    btn.classList.toggle('selected', isSelected);
    btn.innerHTML = `${isSelected ? '✓ ' : ''}${symptom}`;
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
      alert('Data imported successfully! 🎉');
      renderApp();
    } else {
      alert('Error importing data. Please check the file format.');
    }
  };
  reader.readAsText(file);
}

// Initialize
loadAppState();
renderApp();