// MediTrack - Vitals Module

import { VitalsLog, AppData } from '../types';
import { generateId } from '../utils';
import { saveAppData, getTodayDateString } from '../storage';

let appData: AppData;

export function initVitalsModule(data: AppData): void {
  appData = data;
}

export function getVitalsHistory(days: number = 30): VitalsLog[] {
  const today = new Date(getTodayDateString());
  const history: VitalsLog[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const logs = appData.vitalsLogs.filter((log) => log.date === dateStr);
    if (logs.length > 0) {
      // Get the latest entry for the day
      history.push(logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]);
    }
  }
  
  return history;
}

export function addVitalsLog(
  vitals: Omit<VitalsLog, 'id' | 'date' | 'timestamp'>
): VitalsLog {
  const newLog: VitalsLog = {
    ...vitals,
    id: generateId(),
    date: getTodayDateString(),
    timestamp: new Date().toISOString(),
  };
  
  appData.vitalsLogs.push(newLog);
  saveAppData(appData);
  return newLog;
}

export function getLatestVitals(): VitalsLog | null {
  if (appData.vitalsLogs.length === 0) return null;
  
  return appData.vitalsLogs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
}

export function getVitalsAverages(days: number = 7): {
  avgHeartRate: number | null;
  avgWeight: number | null;
  avgTemperature: number | null;
  avgBloodPressure: { systolic: number; diastolic: number } | null;
} {
  const recent = getVitalsHistory(days);
  
  const heartRates = recent.filter(v => v.heartRate).map(v => v.heartRate!);
  const weights = recent.filter(v => v.weight).map(v => v.weight!);
  const temperatures = recent.filter(v => v.temperature).map(v => v.temperature!);
  const bloodPressures = recent.filter(v => v.bloodPressure).map(v => v.bloodPressure!);
  
  const avg = (arr: number[]) => 
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
  
  let avgBP = null;
  if (bloodPressures.length > 0) {
    avgBP = {
      systolic: Math.round(bloodPressures.reduce((sum, bp) => sum + bp.systolic, 0) / bloodPressures.length),
      diastolic: Math.round(bloodPressures.reduce((sum, bp) => sum + bp.diastolic, 0) / bloodPressures.length)
    };
  }
  
  return {
    avgHeartRate: avg(heartRates),
    avgWeight: avg(weights),
    avgTemperature: avg(temperatures),
    avgBloodPressure: avgBP
  };
}

export function deleteVitalsLog(id: string): void {
  appData.vitalsLogs = appData.vitalsLogs.filter((log) => log.id !== id);
  saveAppData(appData);
}
