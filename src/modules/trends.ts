// MediTrack - Trend Visualization & Milestones Module

import { WaterLog, SleepLog, MoodEntry } from '../types';

export interface Milestone {
  id: string;
  title: string;
  daysRequired: number;
  icon: string;
  description: string;
  unlocked: boolean;
}

export function getMilestones(currentStreak: number): {
  milestones: Milestone[];
  currentBadge: Milestone;
  nextBadge: Milestone | null;
  progressToNext: number;
} {
  const tiers: Omit<Milestone, 'unlocked'>[] = [
    { id: 'm1', title: 'First Step', daysRequired: 1, icon: '🌱', description: 'Logged your first health check-in' },
    { id: 'm3', title: 'Steady Habit', daysRequired: 3, icon: '🌿', description: '3 consecutive days of consistency' },
    { id: 'm7', title: 'Champion', daysRequired: 7, icon: '🌟', description: 'Full week of health tracking' },
    { id: 'm14', title: 'Fortnight Pro', daysRequired: 14, icon: '💎', description: 'Two uninterrupted weeks' },
    { id: 'm30', title: 'Wellness Legend', daysRequired: 30, icon: '👑', description: '30-day mastery of daily health' },
  ];

  const milestones: Milestone[] = tiers.map(t => ({
    ...t,
    unlocked: currentStreak >= t.daysRequired
  }));

  const unlockedMilestones = milestones.filter(m => m.unlocked);
  const currentBadge = unlockedMilestones[unlockedMilestones.length - 1] || {
    id: 'm0',
    title: 'Just Beginning',
    daysRequired: 0,
    icon: '🎯',
    description: 'Log your first check-in to unlock badges',
    unlocked: true
  };

  const nextBadge = milestones.find(m => !m.unlocked) || null;
  let progressToNext = 100;
  if (nextBadge) {
    const prevDays = currentBadge.daysRequired;
    const needed = nextBadge.daysRequired - prevDays;
    const current = currentStreak - prevDays;
    progressToNext = Math.min(100, Math.max(0, Math.round((current / needed) * 100)));
  }

  return { milestones, currentBadge, nextBadge, progressToNext };
}

export function generateDaysLabels(daysCount: number = 7): { dateStr: string; label: string }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: { dateStr: string; label: string }[] = [];
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    let label = '';
    if (daysCount === 1) {
      label = 'Today';
    } else if (daysCount <= 7) {
      label = i === 0 ? 'Today' : days[d.getDay()];
    } else {
      label = `${d.getDate()} ${months[d.getMonth()]}`;
    }
    result.push({
      dateStr,
      label
    });
  }

  return result;
}

export function generateLast7DaysLabels(): { dateStr: string; label: string }[] {
  return generateDaysLabels(7);
}

export function renderHydrationChartSVG(hydrationLogs: WaterLog[], goal: number = 2000, daysCount: number = 7): string {
  const days = generateDaysLabels(daysCount);
  const width = 460;
  const height = 150;
  const padding = { top: 25, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let barWidth = 26;
  if (daysCount === 1) {
    barWidth = 64;
  } else if (daysCount > 14) {
    barWidth = Math.max(7, Math.floor((chartW / days.length) * 0.7));
  }
  const step = chartW / days.length;
  const maxVal = Math.max(goal, ...hydrationLogs.map(l => l.amount), 2500);

  const goalY = padding.top + chartH - (goal / maxVal) * chartH;

  const bars = days.map((day, idx) => {
    const log = hydrationLogs.find(l => l.date === day.dateStr);
    const amount = log ? log.amount : 0;
    const barH = Math.min(chartH, (amount / maxVal) * chartH);
    const x = padding.left + idx * step + (step - barWidth) / 2;
    const y = padding.top + chartH - barH;
    const isMet = amount >= goal;

    let showLabel = true;
    if (daysCount > 7) {
      showLabel = (idx % 5 === 0) || (idx === days.length - 1);
    }
    const showValue = daysCount <= 7 ? amount > 0 : (amount > 0 && showLabel);

    return `
      <g class="chart-bar-group">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="${daysCount > 14 ? 3 : 6}" fill="${isMet ? '#0D9488' : '#5EEAD4'}" opacity="0.9" />
        ${showLabel ? `<text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="${daysCount > 7 ? 9 : 11}" fill="currentColor" opacity="0.7">${day.label}</text>` : ''}
        ${showValue ? `<text x="${x + barWidth / 2}" y="${Math.max(y - 4, 15)}" text-anchor="middle" font-size="${daysCount > 7 ? 8 : 10}" font-weight="700" fill="currentColor">${Math.round(amount)}</text>` : ''}
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="trend-svg" preserveAspectRatio="xMidYMid meet">
      <!-- Grid line for goal -->
      <line x1="${padding.left}" y1="${goalY}" x2="${width - padding.right}" y2="${goalY}" stroke="#0D9488" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.6" class="trend-goal-line" />
      <text x="${padding.left - 6}" y="${goalY + 4}" text-anchor="end" font-size="9" font-weight="600" fill="#0D9488" class="trend-goal-label">${goal}ml</text>
      <!-- Base axis -->
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="currentColor" opacity="0.2" stroke-width="1" class="trend-axis-line" />
      ${bars}
    </svg>
  `;
}

export function renderMoodSleepChartSVG(moodEntries: MoodEntry[], sleepLogs: SleepLog[], daysCount: number = 7): string {
  const days = generateDaysLabels(daysCount);
  const width = 460;
  const height = 150;
  const padding = { top: 25, right: 35, bottom: 30, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const step = days.length > 1 ? chartW / (days.length - 1) : chartW;

  // Points for Mood (1 to 5)
  const moodPoints: { x: number; y: number; val: number | null }[] = days.map((d, i) => {
    const entry = moodEntries.find(m => m.date === d.dateStr);
    const x = padding.left + (days.length > 1 ? i * step : chartW / 2);
    if (entry && entry.mood) {
      const y = padding.top + chartH - ((entry.mood - 1) / 4) * chartH;
      return { x, y, val: entry.mood };
    }
    return { x, y: 0, val: null };
  });

  // Points for Sleep (0 to 12 hours)
  const sleepPoints: { x: number; y: number; val: number | null }[] = days.map((d, i) => {
    const log = sleepLogs.find(s => s.date === d.dateStr);
    const x = padding.left + (days.length > 1 ? i * step : chartW / 2);
    if (log && log.duration) {
      const y = padding.top + chartH - (Math.min(12, log.duration) / 12) * chartH;
      return { x, y, val: log.duration };
    }
    return { x, y: 0, val: null };
  });

  const validMood = moodPoints.filter(p => p.val !== null);
  const moodPath = validMood.length > 1 
    ? `M ${validMood.map(p => `${p.x},${p.y}`).join(' L ')}` 
    : '';

  const validSleep = sleepPoints.filter(p => p.val !== null);
  const sleepPath = validSleep.length > 1 
    ? `M ${validSleep.map(p => `${p.x},${p.y}`).join(' L ')}` 
    : '';

  const labels = days.map((d, i) => {
    const x = padding.left + (days.length > 1 ? i * step : chartW / 2);
    if (daysCount > 7 && (i % 5 !== 0 && i !== days.length - 1)) {
      return '';
    }
    return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="${daysCount > 7 ? 9 : 11}" fill="currentColor" opacity="0.7">${d.label}</text>`;
  }).join('');

  const moodRadius = daysCount > 14 ? 3 : 4.5;
  const sleepRadius = daysCount > 14 ? 2.5 : 4;

  const moodDots = validMood.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="${moodRadius}" fill="#8B5CF6" stroke="#FFFFFF" stroke-width="1.5" />
    ${daysCount <= 7 ? `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="9" font-weight="700" fill="#8B5CF6">${p.val}★</text>` : ''}
  `).join('');

  const sleepDots = validSleep.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="${sleepRadius}" fill="#3B82F6" stroke="#FFFFFF" stroke-width="1.5" />
    ${daysCount <= 7 ? `<text x="${p.x}" y="${p.y + 13}" text-anchor="middle" font-size="9" font-weight="700" fill="#3B82F6">${p.val}h</text>` : ''}
  `).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="trend-svg" preserveAspectRatio="xMidYMid meet">
      <!-- Grid lines -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="currentColor" opacity="0.1" stroke-width="1" />
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="currentColor" opacity="0.2" stroke-width="1" />
      
      ${moodPath ? `<path d="${moodPath}" fill="none" stroke="#8B5CF6" stroke-width="2.5" stroke-linecap="round" />` : ''}
      ${sleepPath ? `<path d="${sleepPath}" fill="none" stroke="#3B82F6" stroke-width="2" stroke-dasharray="3,3" stroke-linecap="round" />` : ''}
      
      ${labels}
      ${moodDots}
      ${sleepDots}
    </svg>
  `;
}

export function calculateCorrelationInsight(
  hydrationLogs: WaterLog[],
  sleepLogs: SleepLog[],
  moodEntries: MoodEntry[]
): string {
  if (moodEntries.length < 2) {
    return "Log your check-in, hydration, and sleep over several days to uncover your personal health patterns.";
  }

  // Correlate hydration with mood
  let highWaterMoods: number[] = [];
  let lowWaterMoods: number[] = [];

  moodEntries.forEach(m => {
    const water = hydrationLogs.find(w => w.date === m.date);
    if (water) {
      if (water.amount >= 1750) highWaterMoods.push(m.mood);
      else lowWaterMoods.push(m.mood);
    }
  });

  if (highWaterMoods.length > 0 && lowWaterMoods.length > 0) {
    const highAvg = highWaterMoods.reduce((a, b) => a + b, 0) / highWaterMoods.length;
    const lowAvg = lowWaterMoods.reduce((a, b) => a + b, 0) / lowWaterMoods.length;
    if (highAvg > lowAvg + 0.3) {
      return `💡 Pattern detected: Your mood scores average ${(highAvg).toFixed(1)}/5 on days you drink plenty of water vs ${(lowAvg).toFixed(1)}/5 on lower hydration days.`;
    }
  }

  // Correlate sleep with mood
  let goodSleepMoods: number[] = [];
  let poorSleepMoods: number[] = [];

  moodEntries.forEach(m => {
    const sleep = sleepLogs.find(s => s.date === m.date);
    if (sleep) {
      if (sleep.duration >= 7) goodSleepMoods.push(m.mood);
      else poorSleepMoods.push(m.mood);
    }
  });

  if (goodSleepMoods.length > 0 && poorSleepMoods.length > 0) {
    const goodAvg = goodSleepMoods.reduce((a, b) => a + b, 0) / goodSleepMoods.length;
    const poorAvg = poorSleepMoods.reduce((a, b) => a + b, 0) / poorSleepMoods.length;
    if (goodAvg > poorAvg + 0.3) {
      return `💡 Rest insight: Your mood averages ${(goodAvg).toFixed(1)}/5 when you get 7+ hours of sleep, compared to ${(poorAvg).toFixed(1)}/5 with less rest.`;
    }
  }

  return "Consistency is key! Keep recording your daily rhythm to unlock more behavioral health correlations.";
}

/**
 * Modern SVG Semi-Circle Radial Arc Gauge (Half-Donut Speedometer)
 * Displays synthesized Health Adherence Score matching Mockup Screen 3
 */
export function renderRadialAdherenceGaugeSVG(
  score: number = 0,
  scoreLabel: string = '85%',
  statusText: string = 'Normal',
  subtitle: string = 'Overview'
): string {
  const boundedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = 95;
  const cx = 140;
  const cy = 125;
  const circum = Math.PI * radius; // ~298.45
  const offset = circum * (1 - boundedScore / 100);

  // Knob position along arc
  const angle = Math.PI - (boundedScore / 100) * Math.PI;
  const knobX = cx + radius * Math.cos(angle);
  const knobY = cy - radius * Math.sin(angle);

  // Determine status color
  let statusColor = '#0D9488';
  let statusBg = 'rgba(13, 148, 136, 0.12)';
  if (boundedScore < 50) {
    statusColor = '#E11D48';
    statusBg = 'rgba(225, 29, 72, 0.12)';
  } else if (boundedScore < 75) {
    statusColor = '#D97706';
    statusBg = 'rgba(217, 119, 6, 0.12)';
  }

  return `
    <div class="radial-gauge-wrapper">
      <svg viewBox="0 0 280 155" class="radial-gauge-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0284C7" />
            <stop offset="55%" stop-color="#0D9488" />
            <stop offset="100%" stop-color="#2DD4BF" />
          </linearGradient>
          <filter id="knobGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(13, 148, 136, 0.4)" />
          </filter>
        </defs>

        <!-- Background Track Arc -->
        <path
          d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}"
          fill="none"
          stroke="var(--border-color, rgba(13, 148, 136, 0.15))"
          stroke-width="16"
          stroke-linecap="round"
        />

        <!-- Active Progress Arc -->
        <path
          d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}"
          fill="none"
          stroke="url(#gaugeGradient)"
          stroke-width="16"
          stroke-linecap="round"
          stroke-dasharray="${circum.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          style="transition: stroke-dashoffset 0.8s ease;"
        />

        <!-- Active Knob Indicator -->
        <circle
          cx="${knobX.toFixed(2)}"
          cy="${knobY.toFixed(2)}"
          r="9"
          fill="#FFFFFF"
          stroke="${statusColor}"
          stroke-width="3.5"
          filter="url(#knobGlow)"
          style="transition: cx 0.8s ease, cy 0.8s ease;"
        />

        <!-- Center Score Text -->
        <text x="${cx}" y="${cy - 20}" text-anchor="middle" font-size="34" font-weight="800" fill="var(--text-main, #0F172A)" font-family="inherit">
          ${scoreLabel}
        </text>

        <!-- Subtitle / Overview -->
        <text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text-muted, #64748B)" font-family="inherit">
          ${subtitle}
        </text>
      </svg>

      <!-- Status Pill Badge -->
      <div class="radial-gauge-status-row">
        <span class="gauge-status-pill" style="background:${statusBg}; color:${statusColor}; border:1px solid ${statusColor}40;">
          ● ${statusText}
        </span>
      </div>

      <!-- Segmented Legend -->
      <div class="radial-gauge-legend">
        <span class="legend-item"><span class="legend-dot dot-normal"></span> 75-100% Normal</span>
        <span class="legend-item"><span class="legend-dot dot-moderate"></span> 50-74% Moderate</span>
        <span class="legend-item"><span class="legend-dot dot-low"></span> &lt;50% Needs Care</span>
      </div>
    </div>
  `;
}


