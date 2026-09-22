// MediTrack - Medicine Module

import { Medicine, MedicineLog, AppData } from '../types';
import { generateId, shouldShowMedicineToday, formatTime } from '../utils';
import { saveAppData, getTodayDateString } from '../storage';

let appData: AppData;

export interface TodayMedicineItem {
  medicine: Medicine;
  doseIndex: number;
  time: string;
  totalDoses: number;
  doseLabel?: string;
  log?: MedicineLog;
}

export function initMedicineModule(data: AppData): void {
  appData = data;
}

export function getMedicines(): Medicine[] {
  return appData.medicines;
}

export function addMedicine(medicine: Omit<Medicine, 'id' | 'createdAt'>): Medicine {
  const times = (medicine.times && medicine.times.length > 0)
    ? medicine.times
    : [medicine.time];
  const dosesPerDay = medicine.dosesPerDay || times.length;

  const newMedicine: Medicine = {
    ...medicine,
    times,
    time: times[0] || medicine.time,
    dosesPerDay,
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

export function getTodayMedicineList(): TodayMedicineItem[] {
  const today = getTodayDateString();
  
  // Get medicines that should be taken today
  const todaysMeds = appData.medicines.filter((med) =>
    shouldShowMedicineToday(med.frequency, med.specificDays)
  );

  // Get today's logs
  const todaysLogs = appData.medicineLogs.filter((log) => log.date === today);

  const result: TodayMedicineItem[] = [];

  for (const medicine of todaysMeds) {
    const times = (medicine.times && medicine.times.length > 0) ? medicine.times : [medicine.time];
    const totalDoses = times.length;

    times.forEach((timeStr, doseIndex) => {
      const log = todaysLogs.find(
        (l) => l.medicineId === medicine.id && (l.doseIndex ?? 0) === doseIndex
      );
      result.push({
        medicine,
        doseIndex,
        time: timeStr,
        totalDoses,
        doseLabel: totalDoses > 1 ? `Dose ${doseIndex + 1}/${totalDoses}` : undefined,
        log,
      });
    });
  }

  // Sort chronologically by scheduled time
  result.sort((a, b) => a.time.localeCompare(b.time));

  return result;
}

export function markMedicineTaken(medicineId: string, doseIndex: number = 0): void {
  const today = getTodayDateString();
  
  let log = appData.medicineLogs.find(
    (log) => log.medicineId === medicineId && log.date === today && (log.doseIndex ?? 0) === doseIndex
  );

  const wasTaken = log ? log.taken : false;

  if (log) {
    log.taken = true;
    log.takenAt = new Date().toISOString();
    log.skipped = false;
  } else {
    log = {
      medicineId,
      doseIndex,
      date: today,
      taken: true,
      takenAt: new Date().toISOString(),
    };
    appData.medicineLogs.push(log);
  }

  // Decrease inventory only if transitioning from untaken to taken
  if (!wasTaken) {
    const medicine = appData.medicines.find((m) => m.id === medicineId);
    if (medicine && medicine.inventory > 0) {
      medicine.inventory = Math.max(0, medicine.inventory - 1);
    }
  }

  saveAppData(appData);
}

export function markMedicineSkipped(medicineId: string, doseIndex: number = 0): void {
  const today = getTodayDateString();
  
  let log = appData.medicineLogs.find(
    (log) => log.medicineId === medicineId && log.date === today && (log.doseIndex ?? 0) === doseIndex
  );

  const wasTaken = log ? log.taken : false;

  if (log) {
    log.skipped = true;
    log.taken = false;
  } else {
    log = {
      medicineId,
      doseIndex,
      date: today,
      taken: false,
      skipped: true,
    };
    appData.medicineLogs.push(log);
  }

  // Restore inventory if it was marked taken earlier
  if (wasTaken) {
    const medicine = appData.medicines.find((m) => m.id === medicineId);
    if (medicine) {
      medicine.inventory += 1;
    }
  }

  saveAppData(appData);
}

export function unmarkMedicine(medicineId: string, doseIndex: number = 0): void {
  const today = getTodayDateString();
  
  const logIndex = appData.medicineLogs.findIndex(
    (log) => log.medicineId === medicineId && log.date === today && (log.doseIndex ?? 0) === doseIndex
  );

  if (logIndex !== -1) {
    const wasTaken = appData.medicineLogs[logIndex].taken;
    appData.medicineLogs.splice(logIndex, 1);
    
    // Restore inventory if it was marked taken
    if (wasTaken) {
      const medicine = appData.medicines.find((m) => m.id === medicineId);
      if (medicine) {
        medicine.inventory += 1;
      }
    }
    
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

export function getLowInventoryMedicines(threshold: number = 5): Medicine[] {
  return appData.medicines.filter((m) => m.inventory <= threshold);
}

export function refillMedicine(id: string, amount: number = 30): void {
  const medicine = appData.medicines.find((m) => m.id === id);
  if (medicine) {
    medicine.inventory += amount;
    saveAppData(appData);
  }
}

