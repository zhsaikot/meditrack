// src/types.ts

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  specificDays: number[]; // For custom frequency (0=Sunday, 1=Monday, etc.)
  inventory: number;
  notes?: string;
  createdAt: string;
}

export interface MedicineLog {
  medicineId: string;
  date: string;
  taken: boolean;
  skipped?: boolean;
  takenAt?: string;
}

export interface WaterLog {
  date: string;
  amount: number;
  goal: number;
}

export type HydrationLog = WaterLog;

export interface MoodEntry {
  id: string;
  date: string;
  mood: number;
  symptoms: string[];
  notes: string;
  createdAt: string;
}

export interface VitalsLog {
  id: string;
  date: string;
  timestamp: string;
  bloodPressure?: { systolic: number; diastolic: number };
  heartRate?: number;
  weight?: number;
  temperature?: number;
  notes?: string;
}

export interface SleepLog {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  duration: number; // in hours
  quality: number; // 1-5 scale
  notes?: string;
}

export interface Appointment {
  id: string;
  title: string;
  doctor: string;
  location: string;
  date: string;
  time: string;
  notes?: string;
  completed: boolean;
  createdAt: string;
}

export interface AppSettings {
  hydrationGoal: number;
  notificationsEnabled: boolean;
  reminderTimes: string[];
  theme: 'light' | 'dark' | 'system';
}

export interface AppData {
  medicines: Medicine[];
  medicineLogs: MedicineLog[];
  hydrationLogs: WaterLog[];
  moodEntries: MoodEntry[];
  vitalsLogs: VitalsLog[];
  sleepLogs: SleepLog[];
  appointments: Appointment[];
  settings: AppSettings;
}