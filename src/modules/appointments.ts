// MediTrack - Appointments Module

import { Appointment, AppData } from '../types';
import { generateId } from '../utils';
import { saveAppData, getTodayDateString, isPast, isFuture, getCountdownDisplay, formatDateDisplay } from '../storage';

let appData: AppData;

export function initAppointmentsModule(data: AppData): void {
  appData = data;
}

export function getAppointments(): Appointment[] {
  return appData.appointments.sort(
    (a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
  );
}

export function getUpcomingAppointments(): Appointment[] {
  return getAppointments().filter((apt) => !isPast(apt.date));
}

export function getPastAppointments(): Appointment[] {
  return getAppointments().filter((apt) => isPast(apt.date));
}

export function addAppointment(appointment: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
  const newAppointment: Appointment = {
    ...appointment,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  appData.appointments.push(newAppointment);
  saveAppData(appData);
  return newAppointment;
}

export function updateAppointment(id: string, updates: Partial<Appointment>): void {
  const appointment = appData.appointments.find((a) => a.id === id);
  if (appointment) {
    Object.assign(appointment, updates);
    saveAppData(appData);
  }
}

export function deleteAppointment(id: string): void {
  appData.appointments = appData.appointments.filter((a) => a.id !== id);
  saveAppData(appData);
}

export function getNextAppointment(): Appointment | null {
  const upcoming = getUpcomingAppointments();
  return upcoming.length > 0 ? upcoming[0] : null;
}

export function formatAppointmentDisplay(appointment: Appointment): {
  dateDisplay: string;
  countdown: string;
  timeDisplay: string;
} {
  return {
    dateDisplay: formatDateDisplay(appointment.date),
    countdown: getCountdownDisplay(appointment.date, appointment.time),
    timeDisplay: formatTimeDisplay(appointment.time),
  };
}

function formatTimeDisplay(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getAppointmentsCount(): { upcoming: number; past: number } {
  const upcoming = getUpcomingAppointments().length;
  const past = getPastAppointments().length;
  return { upcoming, past };
}
