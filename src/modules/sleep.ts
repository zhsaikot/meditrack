// MediTrack - Sleep Module

import { SleepLog, AppData } from '../types';
import { generateId } from '../utils';
import { saveAppData, getTodayDateString } from '../storage';

let appData: AppData;

export function initSleepModule(data: AppData): void {
  appData = data;
}

export function getSleepHistory(days: number = 30): SleepLog[] {
  const today = new Date(getTodayDateString());
  const history: SleepLog[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const log = appData.sleepLogs.find((l) => l.date === dateStr);
    if (log) {
      history.push(log);
    }
  }
  
  return history;
}

export function addSleepLog(
  sleep: Omit<SleepLog, 'id' | 'date' | 'duration'>
): SleepLog {
  const bedtime = new Date(`2000-01-01T${sleep.bedtime}`);
  const wakeTime = new Date(`2000-01-01T${sleep.wakeTime}`);
  
  // Calculate duration in hours
  let duration = (wakeTime.getTime() - bedtime.getTime()) / (1000 * 60 * 60);
  if (duration < 0) {
    // Slept past midnight
    duration += 24;
  }
  
  const newLog: SleepLog = {
    ...sleep,
    id: generateId(),
    date: getTodayDateString(),
    duration: Math.round(duration * 10) / 10,
  };
  
  appData.sleepLogs.push(newLog);
  saveAppData(appData);
  return newLog;
}

export function getLatestSleep(): SleepLog | null {
  if (appData.sleepLogs.length === 0) return null;
  
  return appData.sleepLogs.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
}

export function getSleepAverage(days: number = 7): {
  avgDuration: number | null;
  avgQuality: number | null;
} {
  const recent = getSleepHistory(days);
  
  if (recent.length === 0) {
    return { avgDuration: null, avgQuality: null };
  }
  
  const totalDuration = recent.reduce((sum, log) => sum + log.duration, 0);
  const totalQuality = recent.reduce((sum, log) => sum + log.quality, 0);
  
  return {
    avgDuration: Math.round((totalDuration / recent.length) * 10) / 10,
    avgQuality: Math.round((totalQuality / recent.length) * 10) / 10
  };
}

export function deleteSleepLog(id: string): void {
  appData.sleepLogs = appData.sleepLogs.filter((log) => log.id !== id);
  saveAppData(appData);
}

export function getSleepQualityTrend(days: number = 7): 'improving' | 'declining' | 'stable' {
  const recent = getSleepHistory(days);
  
  if (recent.length < 2) return 'stable';
  
  const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
  const secondHalf = recent.slice(Math.floor(recent.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, log) => sum + log.quality, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, log) => sum + log.quality, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  
  if (diff > 0.5) return 'improving';
  if (diff < -0.5) return 'declining';
  return 'stable';
}
