// MediTrack - Medicine Module

import { Medicine, MedicineLog, AppData } from '../types';
import { generateId, shouldShowMedicineToday, formatTime } from '../utils';
import { saveAppData, getTodayDateString } from '../storage';

let appData: AppData;

export function initMedicineModule(data: AppData): void {
  appData = data;
}

export function getMedicines(): Medicine[] {
  return appData.medicines;
}

export function addMedicine(medicine: Omit<Medicine, 'id' | 'createdAt'>): Medicine {
  const newMedicine: Medicine = {
    ...medicine,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  appData.medicines.push(newMedicine);
  saveAppData(appData);
  return newMedicine;
}

export function updateMedicineInventory(id: string, delta: number): void {
  const medicine = appData.medicines.find((m) => m.id === id);
  if (medicine) {
    medicine.inventory = Math.max(0, medicine.inventory + delta);
    saveAppData(appData);
  }
}

export function deleteMedicine(id: string): void {
  appData.medicines = appData.medicines.filter((m) => m.id !== id);
  appData.medicineLogs = appData.medicineLogs.filter((log) => log.medicineId !== id);
  saveAppData(appData);
}

export function getTodayMedicineList(): { medicine: Medicine; log?: MedicineLog }[] {
  const today = getTodayDateString();
  
  // Get medicines that should be taken today
  const todaysMeds = appData.medicines.filter((med) =>
    shouldShowMedicineToday(med.frequency, med.specificDays)
  );

  // Get today's logs
  const todaysLogs = appData.medicineLogs.filter((log) => log.date === today);

  return todaysMeds.map((medicine) => {
    const log = todaysLogs.find((log) => log.medicineId === medicine.id);
    return { medicine, log };
  });
}

export function markMedicineTaken(medicineId: string): void {
  const today = getTodayDateString();
  
  let log = appData.medicineLogs.find(
    (log) => log.medicineId === medicineId && log.date === today
  );

  if (log) {
    log.taken = true;
    log.takenAt = new Date().toISOString();
    log.skipped = false;
  } else {
    log = {
      medicineId,
      date: today,
      taken: true,
      takenAt: new Date().toISOString(),
    };
    appData.medicineLogs.push(log);
  }

  // Decrease inventory
  const medicine = appData.medicines.find((m) => m.id === medicineId);
  if (medicine) {
    medicine.inventory = Math.max(0, medicine.inventory - 1);
  }

  saveAppData(appData);
}

export function markMedicineSkipped(medicineId: string): void {
  const today = getTodayDateString();
  
  let log = appData.medicineLogs.find(
    (log) => log.medicineId === medicineId && log.date === today
  );

  if (log) {
    log.skipped = true;
    log.taken = false;
  } else {
    log = {
      medicineId,
      date: today,
      taken: false,
      skipped: true,
    };
    appData.medicineLogs.push(log);
  }

  saveAppData(appData);
}

export function unmarkMedicine(medicineId: string): void {
  const today = getTodayDateString();
  
  const logIndex = appData.medicineLogs.findIndex(
    (log) => log.medicineId === medicineId && log.date === today
  );

  if (logIndex !== -1) {
    appData.medicineLogs.splice(logIndex, 1);
    saveAppData(appData);
  }
}

export function getTodaysProgress(): { taken: number; total: number; percentage: number } {
  const todayList = getTodayMedicineList();
  const taken = todayList.filter(({ log }) => log?.taken).length;
  const total = todayList.length;
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
  
  return { taken, total, percentage };
}

export function getLowInventoryMedicines(threshold: number = 10): Medicine[] {
  return appData.medicines.filter((m) => m.inventory < threshold);
}
