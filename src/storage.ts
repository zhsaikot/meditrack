// MediTrack - Storage Module

import { AppData, Medicine, MedicineLog, WaterLog, MoodEntry, VitalsLog, SleepLog, Appointment, UserProfile } from './types';

const STORAGE_KEY = 'meditrack_data_v2';

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  heightCm: 170,
  weightKg: 70,
  bloodType: 'O+'
};

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
    theme: 'light',
    language: 'en'
  },
  profile: { ...DEFAULT_PROFILE }
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
    // Migration from legacy localStorage format if available
    const legacyMeds = localStorage.getItem('meditrack_medicines');
    const legacyWater = localStorage.getItem('meditrack_water');
    const legacyMood = localStorage.getItem('meditrack_mood');
    const legacyState = localStorage.getItem('meditrack_state');

    if (legacyMeds || legacyWater || legacyMood || legacyState) {
      const migrated: AppData = { ...DEFAULT_DATA, settings: { ...DEFAULT_DATA.settings } };
      const today = getTodayDateString();

      if (legacyMeds) {
        try {
          const parsed = JSON.parse(legacyMeds);
          if (Array.isArray(parsed)) {
            migrated.medicines = parsed.map((m: any) => ({
              id: m.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: m.name || '',
              dosage: m.dosage || '',
              time: m.time || '08:00',
              taken: false,
              frequency: m.frequency || 'daily',
              specificDays: m.specificDays || [],
              inventory: typeof m.inventory === 'number' ? m.inventory : 30,
              notes: m.notes || '',
              createdAt: m.createdAt || new Date().toISOString()
            }));

            parsed.filter((m: any) => m.taken).forEach((m: any) => {
              migrated.medicineLogs.push({
                medicineId: m.id,
                date: today,
                taken: true,
                takenAt: new Date().toISOString()
              });
            });
          }
        } catch (e) {}
      }

      if (legacyWater) {
        try {
          const parsed = JSON.parse(legacyWater);
          if (parsed && typeof parsed.amount === 'number') {
            migrated.hydrationLogs.push({
              date: parsed.date || today,
              amount: parsed.amount,
              goal: 2000
            });
          }
        } catch (e) {}
      }

      if (legacyMood) {
        try {
          const parsed = JSON.parse(legacyMood);
          if (Array.isArray(parsed)) {
            migrated.moodEntries = parsed;
          }
        } catch (e) {}
      }

      if (legacyState) {
        try {
          const parsed = JSON.parse(legacyState);
          if (parsed && parsed.isDarkMode) {
            migrated.settings.theme = 'dark';
          }
        } catch (e) {}
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return { ...DEFAULT_DATA, settings: { ...DEFAULT_DATA.settings } };
  }
  try {
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) }
    };
  } catch (error) {
    console.error("Failed to parse app data", error);
    return { ...DEFAULT_DATA, settings: { ...DEFAULT_DATA.settings }, profile: { ...DEFAULT_PROFILE } };
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
    if (!data || typeof data !== 'object') return false;

    // Handle legacy format water property
    if (data.water && typeof data.water === 'string') {
      try {
        const waterObj = JSON.parse(data.water);
        if (waterObj.amount) {
          data.hydrationLogs = [{
            date: waterObj.date || getTodayDateString(),
            amount: waterObj.amount,
            goal: 2000
          }];
        }
      } catch (e) {}
    }

    if (Array.isArray(data.medicines) || Array.isArray(data.moodEntries) || data.settings) {
      const current = getAppData();
      const newAppData: AppData = {
        medicines: Array.isArray(data.medicines) ? data.medicines : current.medicines,
        medicineLogs: Array.isArray(data.medicineLogs) ? data.medicineLogs : current.medicineLogs,
        hydrationLogs: Array.isArray(data.hydrationLogs) ? data.hydrationLogs : current.hydrationLogs,
        moodEntries: Array.isArray(data.moodEntries) ? data.moodEntries : current.moodEntries,
        vitalsLogs: Array.isArray(data.vitalsLogs) ? data.vitalsLogs : current.vitalsLogs,
        sleepLogs: Array.isArray(data.sleepLogs) ? data.sleepLogs : current.sleepLogs,
        appointments: Array.isArray(data.appointments) ? data.appointments : current.appointments,
        settings: { ...DEFAULT_DATA.settings, ...(data.settings || current.settings) },
        profile: { ...DEFAULT_PROFILE, ...(data.profile || current.profile || {}) }
      };
      saveAppData(newAppData);
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

export function getUserProfile(): UserProfile {
  const data = getAppData();
  if (!data.profile) {
    data.profile = { ...DEFAULT_PROFILE };
    saveAppData(data);
  }
  return data.profile;
}

export function saveUserProfile(profile: UserProfile): void {
  const data = getAppData();
  data.profile = { ...data.profile, ...profile };
  
  // Also synchronize weight to latest vitals if weightKg changed
  if (profile.weightKg && (!data.vitalsLogs.length || data.vitalsLogs[0].weight !== profile.weightKg)) {
    const today = getTodayDateString();
    let todayVital = data.vitalsLogs.find(v => v.date === today);
    if (todayVital) {
      todayVital.weight = profile.weightKg;
    } else {
      data.vitalsLogs.unshift({
        id: Date.now().toString(),
        date: today,
        timestamp: new Date().toISOString(),
        weight: profile.weightKg
      });
    }
  }

  saveAppData(data);
}

export function setCustomHydrationGoal(goal: number): void {
  const data = getAppData();
  const validGoal = Math.max(500, Math.min(10000, Math.round(goal)));
  data.settings.hydrationGoal = validGoal;
  const today = getTodayDateString();
  const log = data.hydrationLogs.find(l => l.date === today);
  if (log) {
    log.goal = validGoal;
  }
  saveAppData(data);
}

export function getAppLanguage(): 'en' | 'bn' {
  const data = getAppData();
  return data.settings.language || 'en';
}

export function setAppLanguage(lang: 'en' | 'bn'): void {
  const data = getAppData();
  data.settings.language = lang;
  saveAppData(data);
}