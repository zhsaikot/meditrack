// src/main.ts
import './style.css'
import { Medicine, MoodEntry } from './types'
import { getMedicines, addMedicine, toggleMedicine, deleteMedicine } from './storage'
import { getTodayWater, addWater, resetWaterIfNewDay } from './storage'
import { getMoodEntries, saveMoodEntry, getTodayMood } from './storage'

const app = document.querySelector<HTMLDivElement>('#app')!;
const WATER_GOAL = 2000;

// App State
let appState = {
  currentMood: 0,
  currentSymptoms: [] as string[],
  isDarkMode: false
};

// Load saved state
function loadAppState() {
  const saved = localStorage.getItem('meditrack_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    appState.isDarkMode = parsed.isDarkMode || false;
    if (appState.isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    }
  }
  
  // Load today's mood if exists
  const todayMood = getTodayMood();
  if (todayMood) {
    appState.currentMood = todayMood.mood;
    appState.currentSymptoms = [...todayMood.symptoms];
  }
}

function saveAppState() {
  localStorage.setItem('meditrack_state', JSON.stringify({
    isDarkMode: appState.isDarkMode
  }));
}

function renderApp() {
  resetWaterIfNewDay(); 
  const medicines = getMedicines();
  const waterAmount = getTodayWater();
  const waterProgress = Math.min((waterAmount / WATER_GOAL) * 100, 100);
  const moodEntries = getMoodEntries();
  
  // Calculate stats
  const totalMeds = medicines.length;
  const takenMeds = medicines.filter(m => m.taken).length;
  const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 0;
  const streakDays = calculateStreak(moodEntries);
  const nextMedicine = medicines
    .filter(medicine => !medicine.taken)
    .sort((a, b) => a.time.localeCompare(b.time))[0];
  const latestMood = moodEntries[0];
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date());

  const medicineListHTML = medicines.map(med => `
    <div class="medicine-item ${med.taken ? 'taken' : ''}">
      <div class="med-info">
        <strong>${med.name}</strong> <span class="dosage">(${med.dosage})</span>
        <div class="time">🕐 ${med.time}</div>
      </div>
      <div class="med-actions">
        <button class="check-btn" data-id="${med.id}">
          ${med.taken ? '✅' : '⬜'}
        </button>
        <button class="delete-btn" data-id="${med.id}">️</button>
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
            <p class="subtitle">A quieter way to stay on top of today.</p>
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
        <span class="date-strip-note">Your data stays on this device</span>
      </div>

      <section class="welcome-panel">
        <div>
          <p class="eyebrow">GOOD TO SEE YOU</p>
          <h2>Take the day one small step at a time.</h2>
          <p>${nextMedicine ? `Next up: <strong>${nextMedicine.name}</strong> at ${nextMedicine.time}.` : 'Your schedule is clear. Add a medicine when you are ready.'}</p>
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
            <div class="stat-value">${streakDays} days</div>
            <div class="stat-label">Check-in Streak</div>
          </div>
        </div>
      </section>

      <!-- Water Tracker -->
      <section class="card water-card">
        <div class="section-heading light-heading"><div><p class="eyebrow">BODY RHYTHM</p><h2>Hydration</h2></div><span class="water-icon">◌</span></div>
        <p class="card-intro">Small sips add up. You are ${waterAmount >= WATER_GOAL ? 'at your daily goal' : `${WATER_GOAL - waterAmount}ml from your goal`}.</p>
        <div class="water-progress">
          <div class="progress-bar" style="width: ${waterProgress}%"></div>
        </div>
        <div class="water-stats">
          <span>${waterAmount}ml / ${WATER_GOAL}ml</span>
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

      <section class="insight-row">
        <div class="card insight-card">
          <p class="eyebrow">RECENT NOTE</p>
          <h3>${latestMood ? `${latestMood.notes || 'You checked in today.'}` : 'Your journal is ready when you are.'}</h3>
          <p class="muted-copy">${latestMood ? `${latestMood.symptoms.length ? latestMood.symptoms.join(' · ') : 'No symptoms logged'} · Mood ${latestMood.mood}/5` : 'A short check-in can help you spot patterns over time.'}</p>
        </div>
        <div class="card insight-card accent-insight">
          <p class="eyebrow">TODAY'S FOCUS</p>
          <h3>${totalMeds === 0 ? 'Build your routine' : adherenceRate === 100 ? 'Routine complete' : `${totalMeds - takenMeds} medicine${totalMeds - takenMeds === 1 ? '' : 's'} left`}</h3>
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
          <button type="submit" class="btn-primary">Add Medicine</button>
        </form>
      </section>

      <section class="card list-card">
        <div class="section-heading"><div><p class="eyebrow">SCHEDULE</p><h2>Today's medicines</h2></div><span class="progress-pill">${takenMeds} / ${totalMeds} done</span></div>
        <div id="medicine-list">
          ${medicines.length === 0 ? '<p class="empty-state">No medicines added yet.</p>' : medicineListHTML}
        </div>
      </section>
    </div>
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
    addMedicine({
      id: Date.now().toString(),
      name: (document.getElementById('med-name') as HTMLInputElement).value,
      dosage: (document.getElementById('med-dosage') as HTMLInputElement).value,
      time: (document.getElementById('med-time') as HTMLInputElement).value,
      taken: false
    });
    renderApp();
  });

  // Medicine Actions (Check & Delete)
  document.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      toggleMedicine(id);
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
      notes
    });
    
    alert("Check-in saved! 🎉");
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