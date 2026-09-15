// src/main.ts
import './style.css'
import { Medicine, MoodEntry } from './types'
import { getMedicines, addMedicine, toggleMedicine } from './storage'
import { getTodayWater, addWater, resetWaterIfNewDay } from './storage'
import { getMoodEntries, saveMoodEntry, getTodayMood } from './storage'

const app = document.querySelector<HTMLDivElement>('#app')!;
const WATER_GOAL = 2000;

// Temporary state for the mood form before saving
let currentMood = 0;
let currentSymptoms: string[] = [];

function renderApp() {
  resetWaterIfNewDay(); 
  const medicines = getMedicines();
  const waterAmount = getTodayWater();
  const waterProgress = Math.min((waterAmount / WATER_GOAL) * 100, 100);
  const todayMood = getTodayMood();

  // Set initial state if mood was already logged today
  if (todayMood) {
    currentMood = todayMood.mood;
    currentSymptoms = [...todayMood.symptoms];
  } else {
    currentMood = 0;
    currentSymptoms = [];
  }

  const medicineListHTML = medicines.map(med => `
    <div class="medicine-item ${med.taken ? 'taken' : ''}">
      <div class="med-info">
        <strong>${med.name}</strong> <span class="dosage">(${med.dosage})</span>
        <div class="time"> 🕐 ${med.time}</div>
      </div>
      <button class="check-btn" data-id="${med.id}">
        ${med.taken ? '✅' : '⬜'}
      </button>
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

  app.innerHTML = `
    <div class="container">
      <header>
        <h1>💊 MediTrack</h1>
        <p class="subtitle">Your local-first health companion</p>
      </header>

      <!-- Water Tracker -->
      <section class="card water-card">
        <h2>💧 Hydration Tracker</h2>
        <div class="water-progress">
          <div class="progress-bar" style="width: ${waterProgress}%"></div>
        </div>
        <div class="water-stats">
          <span>${waterAmount}ml / ${WATER_GOAL}ml</span>
          <span>${Math.round(waterProgress)}%</span>
        </div>
        <button class="btn-water" id="add-water-btn">💧 Add 250ml</button>
      </section>

      <!-- Mood & Symptom Journal -->
      <section class="card mood-card">
        <h2>📝 Daily Check-in</h2>
        <p class="mood-prompt">How are you feeling today?</p>
        <div class="emoji-grid">
          ${moodEmojis.map(e => `
            <button class="emoji-btn ${currentMood === e.val ? 'selected' : ''}" data-mood="${e.val}">
              <span class="emoji-icon">${e.icon}</span>
              <span class="emoji-label">${e.label}</span>
            </button>
          `).join('')}
        </div>

        <p class="mood-prompt">Any symptoms?</p>
        <div class="symptom-grid">
          ${symptomsList.map(s => `
            <button class="symptom-btn ${currentSymptoms.includes(s) ? 'selected' : ''}" data-symptom="${s}">
              ${s}
            </button>
          `).join('')}
        </div>

        <textarea id="mood-notes" placeholder="Add notes (optional)..." rows="3">${todayMood ? todayMood.notes : ''}</textarea>
        <button class="btn-primary" id="save-mood-btn">Save Check-in</button>
      </section>

      <!-- Medicine Section -->
      <section class="card add-med-card">
        <h2>💊 Add Medicine</h2>
        <form id="add-med-form">
          <input type="text" id="med-name" placeholder="Medicine Name" required />
          <input type="text" id="med-dosage" placeholder="Dosage" required />
          <input type="time" id="med-time" required />
          <button type="submit" class="btn-primary">Add Medicine</button>
        </form>
      </section>

      <section class="card list-card">
        <h2>Today's Medicines</h2>
        <div id="medicine-list">
          ${medicines.length === 0 ? '<p class="empty-state">No medicines added yet.</p>' : medicineListHTML}
        </div>
      </section>
    </div>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  // --- Medicine Logic ---
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

  document.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      toggleMedicine((e.target as HTMLButtonElement).dataset.id!);
      renderApp();
    });
  });

  // --- Water Logic ---
  document.getElementById('add-water-btn')?.addEventListener('click', () => {
    addWater(250);
    renderApp();
  });

  // --- Mood Logic ---
  // 1. Select Emoji
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentMood = parseInt((e.currentTarget as HTMLButtonElement).dataset.mood!);
      renderApp(); // Re-render to update selected state
    });
  });

  // 2. Toggle Symptoms
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const symptom = (e.currentTarget as HTMLButtonElement).dataset.symptom!;
      if (currentSymptoms.includes(symptom)) {
        currentSymptoms = currentSymptoms.filter(s => s !== symptom);
      } else {
        currentSymptoms.push(symptom);
      }
      renderApp(); // Re-render to update selected state
    });
  });

  // 3. Save Mood
  document.getElementById('save-mood-btn')?.addEventListener('click', () => {
    if (currentMood === 0) {
      alert("Please select an emoji first!");
      return;
    }
    const notes = (document.getElementById('mood-notes') as HTMLTextAreaElement).value;
    const today = new Date().toISOString().split('T')[0];
    
    const entry: MoodEntry = {
      id: Date.now().toString(),
      date: today,
      mood: currentMood,
      symptoms: currentSymptoms,
      notes
    };
    
    saveMoodEntry(entry);
    alert("Check-in saved! ");
    renderApp();
  });
}

renderApp();