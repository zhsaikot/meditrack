// src/main.ts
import './style.css'
import { Medicine, MoodEntry, VitalsLog, SleepLog, Appointment } from './types'
import { 
  getMedicines, 
  addMedicine, 
  toggleMedicine, 
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
  importAllData
} from './storage'
import { initVitalsModule, addVitalsLog, getLatestVitals, getVitalsAverages } from './modules/vitals'
import { initSleepModule, addSleepLog, getLatestSleep, getSleepAverage } from './modules/sleep'
import { initJournalModule, getMoodHistory, getMoodAverage } from './modules/journal'
import { initHydrationModule, getHydrationGoal, setHydrationGoal, getTodaysHydration } from './modules/hydration'
import { initMedicineModule, getTodayMedicineList, markMedicineTaken, markMedicineSkipped, unmarkMedicine, getTodaysProgress } from './modules/medicine'
import { initAppointmentsModule, getAppointments, addAppointment, getNextAppointment } from './modules/appointments'
import { getHealthInsight, formatTime } from './utils'

const app = document.querySelector<HTMLDivElement>('#app')!;

// App State
let appState = {
  currentMood: 0,
  currentSymptoms: [] as string[],
  isDarkMode: false,
  vitalsForm: {
    heartRate: '',
    weight: '',
    temperature: '',
    systolic: '',
    diastolic: ''
  },
  sleepForm: {
    bedtime: '23:00',
    wakeTime: '07:00',
    quality: 3
  }
};

// Load saved state
function loadAppState() {
  const data = getAppData();
  appState.isDarkMode = data.settings.theme === 'dark';
  if (appState.isDarkMode) {
    document.documentElement.classList.add('dark-mode');
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
}

function saveAppState() {
  const data = getAppData();
  data.settings.theme = appState.isDarkMode ? 'dark' : 'light';
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
  
  // Calculate stats
  const medProgress = getTodaysProgress();
  const adherenceRate = medProgress.percentage;
  const sleepAvg = getSleepAverage(7);
  const moodAvg = getMoodAverage(7);
  const vitalsAvg = getVitalsAverages(7);
  
  const streakDays = calculateStreak(moodEntries);
  const todaysMedList = getTodayMedicineList();
  const nextMedicine = todaysMedList
    .filter(({ log }) => !log?.taken)
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

  const medicineListHTML = todaysMedList.map(({ medicine, log }) => `
    <div class="medicine-item ${log?.taken ? 'taken' : ''}">
      <div class="med-info">
        <strong>${medicine.name}</strong> <span class="dosage">(${medicine.dosage})</span>
        <div class="time">🕐 ${formatTime(medicine.time)}${nextMedicine?.medicine.id === medicine.id && !log?.taken ? ' · Next' : ''}</div>
        ${medicine.inventory <= 5 ? `<div class="low-stock">⚠️ Low stock: ${medicine.inventory} left</div>` : ''}
      </div>
      <div class="med-actions">
        ${!log?.taken ? `
          <button class="action-btn take-btn" data-id="${medicine.id}" title="Mark as taken">✓</button>
          <button class="action-btn skip-btn" data-id="${medicine.id}" title="Skip today">⊘</button>
        ` : `
          <button class="action-btn undo-btn" data-id="${medicine.id}" title="Undo">↩</button>
        `}
        <button class="delete-btn" data-id="${medicine.id}">🗑</button>
      </div>
    </div>
  `).join('');

  const moodEmojis = [
    { val: 1, icon: '😫', label: 'Terrible' },
    { val: 2, icon: '😕', label: 'Bad' },
    { val: 3, icon: '😐', label: 'Okay' },
    { val: 4, icon: '🙂', label: 'Good' },
    { val: 5, icon: '😄', label: 'Great' }
  ];

  const symptomsList = ['Headache', 'Fatigue', 'Nausea', 'Pain', 'Anxiety', 'Dizziness'];
  const todayMood = getTodayMood();
  const notesValue = todayMood ? todayMood.notes : '';

  app.innerHTML = `
    <div class="container">
      <header class="main-header">
        <div class="brand-lockup">
          <div class="brand-mark">✚</div>
          <div>
            <p class="eyebrow">PERSONAL HEALTH DASHBOARD</p>
            <h1>MediTrack</h1>
            <p class="subtitle">Your complete health companion</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" id="toggle-theme-btn" title="Toggle Dark Mode">
            ${appState.isDarkMode ? '☀️' : '🌙'}
          </button>
          <button class="icon-btn" id="export-data-btn" title="Export Data">💾</button>
          <label class="icon-btn" for="import-file" title="Import Data">📁</label>
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
          <p class="eyebrow">GOOD TO SEE YOU</p>
          <h2>Take the day one small step at a time.</h2>
          <p>${nextMedicine ? `Next up: <strong>${nextMedicine.medicine.name}</strong> at ${formatTime(nextMedicine.medicine.time)}.` : 'Your schedule is clear. Add a medicine when you are ready.'}${nextAppt ? `<br><strong>📅 ${nextAppt.title}</strong> with ${nextAppt.doctor} on ${new Date(nextAppt.date + 'T' + nextAppt.time).toLocaleDateString()}` : ''}</p>
        </div>
        <div class="welcome-orbit" aria-hidden="true"><span>✦</span></div>
      </section>

      <!-- Statistics Card -->
      <section class="card stats-card">
        <div class="section-heading light-heading"><div><p class="eyebrow">AT A GLANCE</p><h2>Today's overview</h2></div><span class="section-kicker">LIVE</span></div>
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
            <div class="stat-value">${sleepAvg.avgDuration ? sleepAvg.avgDuration + 'h' : '--'}</div>
            <div class="stat-label">Avg Sleep</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${streakDays} days</div>
            <div class="stat-label">Check-in Streak</div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="card quick-actions">
        <div class="section-heading"><div><p class="eyebrow">QUICK LOG</p><h2>Record vitals & sleep</h2></div></div>
        <div class="quick-grid">
          <button class="quick-btn" id="show-vitals-btn">❤️ Vitals</button>
          <button class="quick-btn" id="show-sleep-btn">😴 Sleep Log</button>
          <button class="quick-btn" id="show-appointment-btn">📅 Appointment</button>
        </div>
      </section>

      <!-- Water Tracker -->
      <section class="card water-card">
        <div class="section-heading light-heading"><div><p class="eyebrow">BODY RHYTHM</p><h2>Hydration</h2></div><span class="water-icon">◌</span></div>
        <p class="card-intro">Small sips add up. You are ${waterAmount >= hydrationGoal ? 'at your daily goal' : `${hydrationGoal - waterAmount}ml from your goal`}.</p>
        <div class="water-progress">
          <div class="progress-bar" style="width: ${waterProgress}%"></div>
        </div>
        <div class="water-stats">
          <span>${waterAmount}ml / ${hydrationGoal}ml</span>
          <span>${Math.round(waterProgress)}%</span>
        </div>
        <div class="water-actions"><button class="btn-water secondary-water" id="remove-water-btn" aria-label="Remove 250ml">−</button><button class="btn-water" id="add-water-btn">Add 250ml <span>+</span></button></div>
      </section>

      <!-- Mood & Symptom Journal -->
      <section class="card mood-card">
        <div class="section-heading"><div><p class="eyebrow">MENTAL CHECK-IN</p><h2>How are you feeling?</h2></div><span class="section-icon">☼</span></div>
        <p class="mood-prompt">How are you feeling today?</p>
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
          ${symptomsList.map(s => `
            <button class="symptom-btn ${appState.currentSymptoms.includes(s) ? 'selected' : ''}" data-symptom="${s}">
              ${s}
            </button>
          `).join('')}
        </div>

        <textarea id="mood-notes" placeholder="Add notes (optional)..." rows="3">${notesValue}</textarea>
        <button class="btn-primary" id="save-mood-btn">Save today's check-in <span>→</span></button>
      </section>

      <!-- Latest Vitals Display -->
      ${latestVitals ? `
      <section class="card vitals-display">
        <div class="section-heading"><div><p class="eyebrow">LATEST VITALS</p><h2>Your recent readings</h2></div></div>
        <div class="vitals-grid">
          ${latestVitals.heartRate ? `<div class="vital-item"><span class="vital-label">Heart Rate</span><span class="vital-value">${latestVitals.heartRate} bpm</span></div>` : ''}
          ${latestVitals.bloodPressure ? `<div class="vital-item"><span class="vital-label">Blood Pressure</span><span class="vital-value">${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}</span></div>` : ''}
          ${latestVitals.weight ? `<div class="vital-item"><span class="vital-label">Weight</span><span class="vital-value">${latestVitals.weight} kg</span></div>` : ''}
          ${latestVitals.temperature ? `<div class="vital-item"><span class="vital-label">Temperature</span><span class="vital-value">${latestVitals.temperature}°C</span></div>` : ''}
        </div>
      </section>
      ` : ''}

      <!-- Latest Sleep Display -->
      ${latestSleep ? `
      <section class="card sleep-display">
        <div class="section-heading"><div><p class="eyebrow">LAST NIGHT'S SLEEP</p><h2>Sleep summary</h2></div></div>
        <div class="sleep-summary">
          <div class="sleep-stat"><span class="sleep-value">${latestSleep.duration}h</span><span class="sleep-label">Duration</span></div>
          <div class="sleep-stat"><span class="sleep-value">${'😴'.repeat(latestSleep.quality)}${'🌑'.repeat(5 - latestSleep.quality)}</span><span class="sleep-label">Quality</span></div>
          <div class="sleep-stat"><span class="sleep-value">${formatTime(latestSleep.bedtime)} - ${formatTime(latestSleep.wakeTime)}</span><span class="sleep-label">Schedule</span></div>
        </div>
      </section>
      ` : ''}

      <section class="insight-row">
        <div class="card insight-card">
          <p class="eyebrow">RECENT NOTE</p>
          <h3>${latestMood ? `${latestMood.notes || 'You checked in today.'}` : 'Your journal is ready when you are.'}</h3>
          <p class="muted-copy">${latestMood ? `${latestMood.symptoms.length ? latestMood.symptoms.join(' · ') : 'No symptoms logged'} · Mood ${latestMood.mood}/5` : 'A short check-in can help you spot patterns over time.'}</p>
        </div>
        <div class="card insight-card accent-insight">
          <p class="eyebrow">TODAY'S FOCUS</p>
          <h3>${medProgress.total === 0 ? 'Build your routine' : adherenceRate === 100 ? 'Routine complete' : `${medProgress.total - medProgress.taken} medicine${medProgress.total - medProgress.taken === 1 ? '' : 's'} left`}</h3>
          <p class="muted-copy">${streakDays > 1 ? `${streakDays} days of consistent check-ins.` : 'Consistency starts with one action.'}</p>
        </div>
      </section>

      <!-- Medicine Section -->
      <section class="card add-med-card">
        <div class="section-heading"><div><p class="eyebrow">YOUR ROUTINE</p><h2>Add a medicine</h2></div><span class="section-icon">＋</span></div>
        <form id="add-med-form">
          <input type="text" id="med-name" placeholder="Medicine Name (e.g., Ibuprofen)" required />
          <input type="text" id="med-dosage" placeholder="Dosage (e.g., 200mg)" required />
          <input type="time" id="med-time" required />
          <select id="med-frequency">
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays only</option>
            <option value="weekends">Weekends only</option>
            <option value="custom">Custom days</option>
          </select>
          <input type="number" id="med-inventory" placeholder="Pill count" min="0" value="30" />
          <button type="submit" class="btn-primary">Add Medicine</button>
        </form>
      </section>

      <section class="card list-card">
        <div class="section-heading"><div><p class="eyebrow">SCHEDULE</p><h2>Today's medicines</h2></div><span class="progress-pill">${medProgress.taken} / ${medProgress.total} done</span></div>
        <div id="medicine-list">
          ${todaysMedList.length === 0 ? '<p class="empty-state">No medicines scheduled for today.</p>' : medicineListHTML}
        </div>
      </section>
    </div>
    
    <!-- Vitals Modal -->
    <dialog id="vitals-modal" class="modal">
      <div class="modal-content">
        <h3>Record Vitals</h3>
        <form id="vitals-form">
          <label>Heart Rate (bpm)<input type="number" id="vitals-hr" placeholder="e.g., 72" /></label>
          <label>Blood Pressure<input type="text" id="vitals-bp" placeholder="120/80" /></label>
          <label>Weight (kg)<input type="number" id="vitals-weight" step="0.1" placeholder="e.g., 70.5" /></label>
          <label>Temperature (°C)<input type="number" id="vitals-temp" step="0.1" placeholder="e.g., 36.6" /></label>
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
          <label>Bedtime<input type="time" id="sleep-bedtime" value="23:00" /></label>
          <label>Wake Time<input type="time" id="sleep-waketime" value="07:00" /></label>
          <label>Sleep Quality (1-5)<input type="range" id="sleep-quality" min="1" max="5" value="3" /><span id="quality-display">3</span></label>
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
          <label>Title<input type="text" id="appt-title" placeholder="e.g., Check-up" required /></label>
          <label>Doctor<input type="text" id="appt-doctor" placeholder="Dr. Name" required /></label>
          <label>Date<input type="date" id="appt-date" required /></label>
          <label>Time<input type="time" id="appt-time" required /></label>
          <label>Location<input type="text" id="appt-location" placeholder="Clinic/Hospital" /></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-appt-btn">Cancel</button>
            <button type="submit" class="btn-primary">Add Appointment</button>
          </div>
        </form>
      </div>
    </dialog>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  // Theme Toggle
  document.getElementById('toggle-theme-btn')?.addEventListener('click', () => {
    appState.isDarkMode = !appState.isDarkMode;
    document.documentElement.classList.toggle('dark-mode');
    saveAppState();
    renderApp();
  });

  // Export Data
  document.getElementById('export-data-btn')?.addEventListener('click', exportData);

  // Import Data
  document.getElementById('import-file')?.addEventListener('change', importData);

  // Medicine Form
  const form = document.getElementById('add-med-form') as HTMLFormElement;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const frequency = (document.getElementById('med-frequency') as HTMLSelectElement).value as 'daily' | 'weekdays' | 'weekends' | 'custom';
    addMedicine({
      id: Date.now().toString(),
      name: (document.getElementById('med-name') as HTMLInputElement).value,
      dosage: (document.getElementById('med-dosage') as HTMLInputElement).value,
      time: (document.getElementById('med-time') as HTMLInputElement).value,
      taken: false,
      frequency: frequency,
      specificDays: [],
      inventory: parseInt((document.getElementById('med-inventory') as HTMLInputElement).value) || 30,
      createdAt: new Date().toISOString()
    });
    renderApp();
  });

  // Medicine Actions (Take, Skip, Undo & Delete)
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

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      if (confirm('Delete this medicine?')) {
        deleteMedicine(id);
        renderApp();
      }
    });
  });

  // Water Button
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

  // Mood Selection - FIXED: Update state before re-render
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const moodValue = parseInt((e.currentTarget as HTMLButtonElement).dataset.mood!);
      appState.currentMood = moodValue; // Update state FIRST
      // Don't re-render here - wait for save or let user continue
      updateEmojiUI();
    });
  });

  // Symptom Selection - FIXED: Update state before re-render
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
    const notes = (document.getElementById('mood-notes') as HTMLTextAreaElement).value;
    const today = new Date().toISOString().split('T')[0];
    
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

  // Modal Controls - Vitals
  const vitalsModal = document.getElementById('vitals-modal') as HTMLDialogElement;
  const sleepModal = document.getElementById('sleep-modal') as HTMLDialogElement;
  const apptModal = document.getElementById('appointment-modal') as HTMLDialogElement;

  document.getElementById('show-vitals-btn')?.addEventListener('click', () => {
    vitalsModal?.showModal();
  });

  document.getElementById('close-vitals-btn')?.addEventListener('click', () => {
    vitalsModal?.close();
  });

  document.getElementById('vitals-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const hr = (document.getElementById('vitals-hr') as HTMLInputElement).value;
    const bp = (document.getElementById('vitals-bp') as HTMLInputElement).value;
    const weight = (document.getElementById('vitals-weight') as HTMLInputElement).value;
    const temp = (document.getElementById('vitals-temp') as HTMLInputElement).value;
    
    let bloodPressure = undefined;
    if (bp && bp.includes('/')) {
      const [systolic, diastolic] = bp.split('/').map(Number);
      bloodPressure = { systolic, diastolic };
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

  // Modal Controls - Sleep
  document.getElementById('show-sleep-btn')?.addEventListener('click', () => {
    sleepModal?.showModal();
  });

  document.getElementById('close-sleep-btn')?.addEventListener('click', () => {
    sleepModal?.close();
  });

  document.getElementById('sleep-quality')?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    document.getElementById('quality-display')!.textContent = val;
  });

  document.getElementById('sleep-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const bedtime = (document.getElementById('sleep-bedtime') as HTMLInputElement).value;
    const wakeTime = (document.getElementById('sleep-waketime') as HTMLInputElement).value;
    const quality = parseInt((document.getElementById('sleep-quality') as HTMLInputElement).value);
    
    // Calculate duration
    const bed = new Date(`2000-01-01T${bedtime}`);
    const wake = new Date(`2000-01-01T${wakeTime}`);
    let duration = (wake.getTime() - bed.getTime()) / (1000 * 60 * 60);
    if (duration < 0) duration += 24; // Handle overnight sleep
    
    addSleepLog({
      bedtime,
      wakeTime,
      quality
    });
    
    sleepModal?.close();
    renderApp();
  });

  // Modal Controls - Appointments
  document.getElementById('show-appointment-btn')?.addEventListener('click', () => {
    apptModal?.showModal();
  });

  document.getElementById('close-appt-btn')?.addEventListener('click', () => {
    apptModal?.close();
  });

  document.getElementById('appointment-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = (document.getElementById('appt-title') as HTMLInputElement).value;
    const doctor = (document.getElementById('appt-doctor') as HTMLInputElement).value;
    const date = (document.getElementById('appt-date') as HTMLInputElement).value;
    const time = (document.getElementById('appt-time') as HTMLInputElement).value;
    const location = (document.getElementById('appt-location') as HTMLInputElement).value;
    
    addAppointment({
      title,
      doctor,
      date,
      time,
      location,
      completed: false,
      createdAt: new Date().toISOString()
    });
    
    apptModal?.close();
    renderApp();
  });
}

// Helper: Update UI without full re-render (for better UX)
function updateEmojiUI() {
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    const moodVal = parseInt(btn.getAttribute('data-mood')!);
    btn.classList.toggle('selected', moodVal === appState.currentMood);
  });
}

function updateSymptomUI() {
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    const symptom = btn.getAttribute('data-symptom')!;
    btn.classList.toggle('selected', appState.currentSymptoms.includes(symptom));
  });
}

// Helper: Calculate streak
function calculateStreak(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < entries.length; i++) {
    const entryDate = new Date(entries[i].date);
    const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === i) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// Export Data Function
function exportData() {
  const data = {
    medicines: getMedicines(),
    moodEntries: getMoodEntries(),
    water: localStorage.getItem('meditrack_water'),
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meditrack-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import Data Function
function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      
      if (data.medicines) {
        localStorage.setItem('meditrack_medicines', JSON.stringify(data.medicines));
      }
      if (data.moodEntries) {
        localStorage.setItem('meditrack_mood', JSON.stringify(data.moodEntries));
      }
      if (data.water) {
        localStorage.setItem('meditrack_water', data.water);
      }
      
      alert('Data imported successfully! 🎉');
      renderApp();
    } catch (err) {
      alert('Error importing data. Please check the file format.');
    }
  };
  reader.readAsText(file);
}

// Initialize
loadAppState();
renderApp();