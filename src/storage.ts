// src/storage.ts
import { Medicine } from './types';

const MEDICINE_KEY = 'meditrack_medicines';

// Load medicines from LocalStorage
export function getMedicines(): Medicine[] {
  const data = localStorage.getItem(MEDICINE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to parse medicines", error);
    return [];
  }
}

// Save medicines to LocalStorage
export function saveMedicines(medicines: Medicine[]): void {
  localStorage.setItem(MEDICINE_KEY, JSON.stringify(medicines));
}

// Add a new medicine
export function addMedicine(med: Medicine): void {
  const medicines = getMedicines();
  medicines.push(med);
  saveMedicines(medicines);
}

// Toggle the "taken" status of a medicine
export function toggleMedicine(id: string): void {
  const medicines = getMedicines();
  const index = medicines.findIndex(m => m.id === id);
  if (index !== -1) {
    medicines[index].taken = !medicines[index].taken;
    saveMedicines(medicines);
  }
}

// src/storage.ts - ADD THIS AT THE BOTTOM

const WATER_KEY = 'meditrack_water';

// Get today's water amount
export function getTodayWater(): number {
  const today = new Date().toDateString();
  const data = localStorage.getItem(WATER_KEY);
  if (!data) return 0;
  
  try {
    const parsed = JSON.parse(data);
    if (parsed.date === today) {
      return parsed.amount;
    }
    return 0;
  } catch {
    return 0;
  }
}

// Add water (250ml per tap)
export function addWater(amount: number = 250): void {
  const today = new Date().toDateString();
  const currentAmount = getTodayWater();
  
  localStorage.setItem(WATER_KEY, JSON.stringify({
    date: today,
    amount: currentAmount + amount
  }));
}

// Reset water (called automatically at midnight)
export function resetWaterIfNewDay(): void {
  const today = new Date().toDateString();
  const data = localStorage.getItem(WATER_KEY);
  
  if (!data) return;
  
  try {
    const parsed = JSON.parse(data);
    if (parsed.date !== today) {
      localStorage.setItem(WATER_KEY, JSON.stringify({
        date: today,
        amount: 0
      }));
    }
  } catch {
    // Ignore errors
  }
}
// Add this to the bottom of src/storage.ts
import { MoodEntry } from './types'; // Make sure to add this import at the top of the file if not there

const MOOD_KEY = 'meditrack_mood';

export function getMoodEntries(): MoodEntry[] {
  const data = localStorage.getItem(MOOD_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveMoodEntry(entry: MoodEntry): void {
  const entries = getMoodEntries();
  // Remove existing entry for today if it exists (so we only have one per day)
  const filtered = entries.filter(e => e.date !== entry.date);
  // Add the new one to the top
  filtered.unshift(entry); 
  // Save (keep only last 30 entries to prevent storage bloat)
  localStorage.setItem(MOOD_KEY, JSON.stringify(filtered.slice(0, 30)));
}

export function getTodayMood(): MoodEntry | null {
  const today = new Date().toISOString().split('T')[0];
  return getMoodEntries().find(e => e.date === today) || null;
}