// MediTrack - Journal Module

import { MoodEntry, AppData } from '../types';
import { generateId } from '../utils';
import { saveAppData, getTodayDateString, isToday } from '../storage';

let appData: AppData;

export function initJournalModule(data: AppData): void {
  appData = data;
}

export function getTodaysMoodEntry(): MoodEntry | undefined {
  const today = getTodayDateString();
  return appData.moodEntries.find((entry) => entry.date === today);
}

export function saveMoodEntry(
  mood: number,
  symptoms: string[],
  notes: string
): MoodEntry {
  const today = getTodayDateString();
  
  // Check if entry already exists for today
  let entry = appData.moodEntries.find((e) => e.date === today);
  
  if (entry) {
    entry.mood = mood;
    entry.symptoms = symptoms;
    entry.notes = notes;
  } else {
    entry = {
      id: generateId(),
      date: today,
      mood,
      symptoms,
      notes,
      createdAt: new Date().toISOString(),
    };
    appData.moodEntries.push(entry);
  }
  
  saveAppData(appData);
  return entry;
}

export function getMoodHistory(days: number = 30): MoodEntry[] {
  const sorted = [...appData.moodEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sorted.slice(0, days);
}

export function getMoodAverage(days: number = 7): number | null {
  const recent = getMoodHistory(days);
  if (recent.length === 0) return null;
  
  const sum = recent.reduce((acc, entry) => acc + entry.mood, 0);
  return Math.round((sum / recent.length) * 10) / 10;
}

export function getMostCommonSymptoms(days: number = 30): Record<string, number> {
  const recent = getMoodHistory(days);
  const symptomCounts: Record<string, number> = {};
  
  recent.forEach((entry) => {
    entry.symptoms.forEach((symptom) => {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
    });
  });
  
  return symptomCounts;
}

export function deleteMoodEntry(id: string): void {
  appData.moodEntries = appData.moodEntries.filter((entry) => entry.id !== id);
  saveAppData(appData);
}
