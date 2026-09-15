// MediTrack - Utility Functions

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  frequency: 'daily' | 'weekly' | 'specific',
  specificDays?: number[]
): boolean {
  if (frequency === 'daily') {
    return true;
  }
  if (frequency === 'weekly') {
    return true; // Show weekly meds every day for simplicity
  }
  if (frequency === 'specific' && specificDays) {
    return specificDays.includes(getCurrentDayIndex());
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
