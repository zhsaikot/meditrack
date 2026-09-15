// MediTrack - LocalStorage Helper Functions

import { AppData, DEFAULT_DATA } from './types';

const STORAGE_KEY = 'meditrack_data';

export function loadAppData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppData;
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_DATA,
        ...parsed,
        settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      };
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }
  return { ...DEFAULT_DATA };
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
}

export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): AppData | null {
  try {
    const parsed = JSON.parse(jsonString) as AppData;
    // Basic validation
    if (!parsed.medicines || !parsed.settings) {
      throw new Error('Invalid data format');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to import data:', error);
    return null;
  }
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

export function isPast(dateString: string): boolean {
  const today = new Date(getTodayDateString());
  const date = new Date(dateString);
  return date < today;
}

export function isFuture(dateString: string): boolean {
  const today = new Date(getTodayDateString());
  const date = new Date(dateString);
  return date > today;
}

export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date(getTodayDateString());
  
  if (dateString === getTodayDateString()) {
    return 'Today';
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateString === tomorrow.toISOString().split('T')[0]) {
    return 'Tomorrow';
  }
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function getCountdownDisplay(dateString: string, timeString: string): string {
  const dateTime = new Date(`${dateString}T${timeString}`);
  const now = new Date();
  const diffMs = dateTime.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'Now or past';
  }
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays === 0) {
    if (diffHours === 0) {
      return 'In less than an hour';
    }
    return `In ${diffHours}h`;
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays < 7) {
    return `In ${diffDays} days`;
  } else {
    return formatDateDisplay(dateString);
  }
}
