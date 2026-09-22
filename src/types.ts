// src/types.ts

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string; // primary / first dose time for backwards compatibility
  times?: string[]; // list of scheduled dose times e.g. ["08:00", "14:00", "20:00"]
  dosesPerDay?: number; // 1, 2, 3, 4 (defaults to 1)
  taken: boolean;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  specificDays: number[]; // For custom frequency (0=Sunday, 1=Monday, etc.)
  inventory: number;
  notes?: string;
  createdAt: string;
}

export interface MedicineLog {
  medicineId: string;
  doseIndex?: number; // 0, 1, 2... for multiple daily doses
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

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface UserProfile {
  name: string;
  avatarUrl?: string;
  heightCm: number;
  weightKg: number;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  bloodType?: string;
  emergencyContact?: EmergencyContact;
}

export interface AppSettings {
  hydrationGoal: number;
  notificationsEnabled: boolean;
  reminderTimes: string[];
  theme: 'light' | 'dark' | 'system';
  language?: 'en' | 'bn';
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
  profile?: UserProfile;
}