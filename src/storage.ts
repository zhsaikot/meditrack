// MediTrack - Storage Module

import { AppData, Medicine, MedicineLog, WaterLog, MoodEntry, VitalsLog, SleepLog, Appointment } from './types';

const STORAGE_KEY = 'meditrack_data_v2';

const DEFAULT_DATA: AppData = {
  medicines: [],
  medicineLogs: [],
  hydrationLogs: [],
  moodEntries: [],
  vitalsLogs: [],
  sleepLogs: [],
  appointments: [],
  settings: {
    hydrationGoal: 2000,
    notificationsEnabled: false,
    reminderTimes: ['09:00', '14:00', '20:00'],
    theme: 'light'
  }
};

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function isToday(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString === today;
}

export function isPast(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString < today;
}

export function isFuture(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString > today;
}

export function getCountdownDisplay(dateString: string, timeString: string): string {
  const target = new Date(`${dateString}T${timeString}`);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  
  if (diff <= 0) return 'Due now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `In ${days}d`;
  } else if (hours > 0) {
    return `In ${hours}h ${minutes}m`;
  } else {
    return `In ${minutes}m`;
  }
}

export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function loadAppData(): AppData {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return { ...DEFAULT_DATA };
  }
  try {
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings }
    };
  } catch (error) {
    console.error("Failed to parse app data", error);
    return { ...DEFAULT_DATA };
  }
}

let cachedData: AppData | null = null;

export function getAppData(): AppData {
  if (!cachedData) {
    cachedData = loadAppData();
  }
  return cachedData;
}

export function saveAppData(data: AppData): void {
  cachedData = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetAppData(): void {
  cachedData = null;
  localStorage.removeItem(STORAGE_KEY);
}

export function exportAllData(): string {
  const data = getAppData();
  return JSON.stringify({
    ...data,
    exportDate: new Date().toISOString()
  }, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.medicines || data.moodEntries || data.settings) {
      saveAppData({
        ...DEFAULT_DATA,
        ...data,
        settings: { ...DEFAULT_DATA.settings, ...data.settings }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to import data", error);
    return false;
  }
}

// Legacy support functions for backward compatibility
export function getMedicines(): Medicine[] {
  return getAppData().medicines;
}

export function addMedicine(med: Medicine): void {
  const data = getAppData();
  data.medicines.push(med);
  saveAppData(data);
}

export function toggleMedicine(id: string): void {
  const data = getAppData();
  const medicine = data.medicines.find(m => m.id === id);
  if (medicine) {
    medicine.taken = !medicine.taken;
    saveAppData(data);
  }
}

export function deleteMedicine(id: string): void {
  const data = getAppData();
  data.medicines = data.medicines.filter(m => m.id !== id);
  saveAppData(data);
}

export function getTodayWater(): number {
  const today = getTodayDateString();
  const data = getAppData();
  const log = data.hydrationLogs.find(l => l.date === today);
  return log ? log.amount : 0;
}

export function addWater(amount: number): void {
  const data = getAppData();
  const today = getTodayDateString();
  let log = data.hydrationLogs.find(l => l.date === today);
  
  if (log) {
    log.amount = Math.max(0, log.amount + amount);
  } else {
    log = {
      date: today,
      amount: Math.max(0, amount),
      goal: data.settings.hydrationGoal
    };
    data.hydrationLogs.push(log);
  }
  
  saveAppData(data);
}

export function resetWaterIfNewDay(): void {
  const today = getTodayDateString();
  const data = getAppData();
  const lastLog = data.hydrationLogs[data.hydrationLogs.length - 1];
  
  if (lastLog && lastLog.date !== today) {
    // Keep old logs but they won't show for today
  }
}

export function getMoodEntries(): MoodEntry[] {
  return getAppData().moodEntries.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function saveMoodEntry(entry: MoodEntry): void {
  const data = getAppData();
  const existingIndex = data.moodEntries.findIndex(e => e.date === entry.date);
  
  if (existingIndex !== -1) {
    data.moodEntries[existingIndex] = entry;
  } else {
    data.moodEntries.push(entry);
  }
  
  // Keep only last 90 entries
  data.moodEntries.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 90);
  
  saveAppData(data);
}

export function getTodayMood(): MoodEntry | null {
  const today = getTodayDateString();
  return getAppData().moodEntries.find(e => e.date === today) || null;
}