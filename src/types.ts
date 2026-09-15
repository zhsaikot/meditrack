// MediTrack - TypeScript Interfaces

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'weekly' | 'specific';
  specificDays?: number[]; // 0-6 for Sunday-Saturday
  time: string; // HH:MM format
  inventory: number;
  createdAt: string;
}

export interface MedicineLog {
  medicineId: string;
  date: string; // YYYY-MM-DD
  taken: boolean;
  takenAt?: string;
  skipped?: boolean;
}

export interface HydrationLog {
  date: string; // YYYY-MM-DD
  amount: number; // in ml
  goal: number; // daily goal in ml
}

export interface MoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: number; // 1-5 scale
  symptoms: string[];
  notes: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string; // ISO date string
  time: string;
  location: string;
  notes: string;
  createdAt: string;
}

export interface AppData {
  medicines: Medicine[];
  medicineLogs: MedicineLog[];
  hydrationLogs: HydrationLog[];
  moodEntries: MoodEntry[];
  appointments: Appointment[];
  settings: {
    darkMode: boolean;
    hydrationGoal: number;
    notificationsEnabled: boolean;
  };
}

export const DEFAULT_DATA: AppData = {
  medicines: [],
  medicineLogs: [],
  hydrationLogs: [],
  moodEntries: [],
  appointments: [],
  settings: {
    darkMode: false,
    hydrationGoal: 2000,
    notificationsEnabled: false,
  },
};
