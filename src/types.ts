// src/types.ts

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
}

export interface WaterLog {
  date: string; // e.g., "2026-09-15"
  amount: number; // in ml
}
// Add this to the bottom of src/types.ts

export interface MoodEntry {
  id: string;
  date: string; // Format: YYYY-MM-DD
  mood: number; // 1 to 5
  symptoms: string[]; // e.g., ['Headache', 'Fatigue']
  notes: string;
}