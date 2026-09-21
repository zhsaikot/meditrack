// MediTrack - Utility Functions

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getDaysArray(): { value: number; label: string }[] {
  return [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];
}

export function getCurrentDayIndex(): number {
  return new Date().getDay();
}

export function shouldShowMedicineToday(
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom',
  specificDays?: number[]
): boolean {
  const today = getCurrentDayIndex();
  
  if (frequency === 'daily') {
    return true;
  }
  if (frequency === 'weekdays') {
    return today >= 1 && today <= 5;
  }
  if (frequency === 'weekends') {
    return today === 0 || today === 6;
  }
  if (frequency === 'custom' && specificDays) {
    return specificDays.includes(today);
  }
  return false;
}

export const SYMPTOM_TAGS = [
  'Headache',
  'Fatigue',
  'Nausea',
  'Pain',
  'Dizziness',
  'Stress',
  'Insomnia',
  'Appetite Loss',
];

export const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

export const MOOD_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Great',
};

export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateString: string, timeString: string): string {
  const date = new Date(`${dateString}T${timeString}`);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function getTimeUntil(targetTime: string): string {
  const now = new Date();
  const [hours, minutes] = targetTime.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  
  if (target < now) {
    target.setDate(target.getDate() + 1);
  }
  
  const diff = target.getTime() - now.getTime();
  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hoursLeft > 0) {
    return `${hoursLeft}h ${minutesLeft}m`;
  }
  return `${minutesLeft}m`;
}

export function calculateSleepDuration(bedtime: string, wakeTime: string): number {
  const bed = new Date(`2000-01-01T${bedtime}`);
  const wake = new Date(`2000-01-01T${wakeTime}`);
  
  let duration = (wake.getTime() - bed.getTime()) / (1000 * 60 * 60);
  if (duration < 0) {
    duration += 24;
  }
  
  return Math.round(duration * 10) / 10;
}

export function getHealthInsight(data: {
  moodAvg?: number | null;
  sleepAvg?: number | null;
  waterIntake?: number;
  medicineAdherence?: number;
}): string {
  const insights: string[] = [];
  
  if (data.moodAvg && data.moodAvg >= 4) {
    insights.push("Your mood has been great lately! 🌟");
  } else if (data.moodAvg && data.moodAvg <= 2.5) {
    insights.push("Consider taking extra care of yourself today. 💙");
  }
  
  if (data.sleepAvg && data.sleepAvg < 7) {
    insights.push("Try to get more rest tonight. 😴");
  } else if (data.sleepAvg && data.sleepAvg >= 8) {
    insights.push("Your sleep habits are excellent! 🌙");
  }
  
  if (data.waterIntake && data.waterIntake < 1500) {
    insights.push("Don't forget to drink more water! 💧");
  }
  
  if (data.medicineAdherence && data.medicineAdherence >= 90) {
    insights.push("Amazing consistency with your medications! 💊");
  }
  
  if (insights.length === 0) {
    return "You're doing great! Keep it up! 👏";
  }
  
  return insights.join(' ');
}
