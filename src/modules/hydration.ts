// MediTrack - Hydration Module

import { HydrationLog, AppData } from '../types';
import { generateId } from '../utils';
import { saveAppData, getTodayDateString } from '../storage';

let appData: AppData;

export function initHydrationModule(data: AppData): void {
  appData = data;
}

export function getHydrationGoal(): number {
  return appData.settings.hydrationGoal;
}

export function setHydrationGoal(goal: number): void {
  appData.settings.hydrationGoal = goal;
  saveAppData(appData);
}

export function getTodaysHydration(): { amount: number; goal: number; percentage: number } {
  const today = getTodayDateString();
  const todaysLog = appData.hydrationLogs.find((log) => log.date === today);
  
  if (!todaysLog) {
    return { amount: 0, goal: appData.settings.hydrationGoal, percentage: 0 };
  }
  
  const percentage = Math.min(100, Math.round((todaysLog.amount / appData.settings.hydrationGoal) * 100));
  return { 
    amount: todaysLog.amount, 
    goal: appData.settings.hydrationGoal, 
    percentage 
  };
}

export function addWater(amount: number): void {
  const today = getTodayDateString();
  
  let log = appData.hydrationLogs.find((log) => log.date === today);
  
  if (log) {
    log.amount += amount;
  } else {
    log = {
      date: today,
      amount,
      goal: appData.settings.hydrationGoal,
    };
    appData.hydrationLogs.push(log);
  }
  
  saveAppData(appData);
}

export function removeLastWaterEntry(): void {
  const today = getTodayDateString();
  const logIndex = appData.hydrationLogs.findIndex((log) => log.date === today);
  
  if (logIndex !== -1) {
    const log = appData.hydrationLogs[logIndex];
    log.amount = Math.max(0, log.amount - 250);
    
    if (log.amount === 0) {
      appData.hydrationLogs.splice(logIndex, 1);
    }
    
    saveAppData(appData);
  }
}

export function getHydrationHistory(days: number = 7): HydrationLog[] {
  const today = new Date(getTodayDateString());
  const history: HydrationLog[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const log = appData.hydrationLogs.find((l) => l.date === dateStr);
    if (log) {
      history.push(log);
    } else {
      history.push({
        date: dateStr,
        amount: 0,
        goal: appData.settings.hydrationGoal,
      });
    }
  }
  
  return history;
}
