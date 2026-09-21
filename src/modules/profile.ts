// src/modules/profile.ts
// MediTrack - Profile & BMI Calculation Module

export interface BMICalculationResult {
  bmi: number;
  category: 'Underweight' | 'Normal weight' | 'Overweight' | 'Obese';
  color: string;
  badgeBg: string;
  minHealthyWeight: number;
  maxHealthyWeight: number;
  advice: string;
}

export function calculateBMI(weightKg: number, heightCm: number): BMICalculationResult {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) {
    return {
      bmi: 0,
      category: 'Normal weight',
      color: '#0D9488',
      badgeBg: '#CCFBF1',
      minHealthyWeight: 0,
      maxHealthyWeight: 0,
      advice: 'Please set your height and weight in Profile Settings.'
    };
  }

  const heightM = heightCm / 100;
  const rawBMI = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBMI * 10) / 10;

  const minHealthyWeight = Math.round(18.5 * heightM * heightM * 10) / 10;
  const maxHealthyWeight = Math.round(24.9 * heightM * heightM * 10) / 10;

  if (bmi < 18.5) {
    return {
      bmi,
      category: 'Underweight',
      color: '#3B82F6',
      badgeBg: '#DBEAFE',
      minHealthyWeight,
      maxHealthyWeight,
      advice: `Your BMI is below the standard range. A target weight of ${minHealthyWeight}–${maxHealthyWeight} kg is recommended.`
    };
  } else if (bmi <= 24.9) {
    return {
      bmi,
      category: 'Normal weight',
      color: '#10B981',
      badgeBg: '#D1FAE5',
      minHealthyWeight,
      maxHealthyWeight,
      advice: `Great job! Your weight is in the healthy range (${minHealthyWeight}–${maxHealthyWeight} kg). Keep up the good work!`
    };
  } else if (bmi <= 29.9) {
    const diff = Math.round((weightKg - maxHealthyWeight) * 10) / 10;
    return {
      bmi,
      category: 'Overweight',
      color: '#F59E0B',
      badgeBg: '#FEF3C7',
      minHealthyWeight,
      maxHealthyWeight,
      advice: `You are approximately ${diff} kg above the healthy range (${minHealthyWeight}–${maxHealthyWeight} kg). Light exercise and hydration help!`
    };
  } else {
    const diff = Math.round((weightKg - maxHealthyWeight) * 10) / 10;
    return {
      bmi,
      category: 'Obese',
      color: '#EF4444',
      badgeBg: '#FEE2E2',
      minHealthyWeight,
      maxHealthyWeight,
      advice: `Your BMI indicates obesity. Consider discussing a supportive nutrition and wellness plan with your doctor.`
    };
  }
}

/**
 * Generates an SVG visual gauge for BMI
 * Scale runs from 15 to 35.
 */
export function renderBMISpectrumSVG(bmi: number): string {
  const minScale = 15;
  const maxScale = 35;
  const clampedBMI = Math.max(minScale, Math.min(maxScale, bmi || 22));
  
  // Convert BMI to percentage 0..100 on the 15..35 scale
  const percent = ((clampedBMI - minScale) / (maxScale - minScale)) * 100;
  
  // Range segments:
  // Underweight: 15 to 18.5 => (3.5 / 20) * 100 = 17.5%
  // Normal: 18.5 to 24.9 => (6.4 / 20) * 100 = 32%
  // Overweight: 24.9 to 29.9 => (5.0 / 20) * 100 = 25%
  // Obese: 29.9 to 35 => (5.1 / 20) * 100 = 25.5%
  
  return `
    <div class="bmi-gauge-wrap">
      <svg class="bmi-gauge-svg" viewBox="0 0 400 56" preserveAspectRatio="none" role="img" aria-label="BMI Spectrum Gauge">
        <defs>
          <linearGradient id="bmi-spectrum-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#3B82F6" />
            <stop offset="17.5%" stop-color="#3B82F6" />
            <stop offset="17.6%" stop-color="#10B981" />
            <stop offset="49.5%" stop-color="#10B981" />
            <stop offset="49.6%" stop-color="#F59E0B" />
            <stop offset="74.5%" stop-color="#F59E0B" />
            <stop offset="74.6%" stop-color="#EF4444" />
            <stop offset="100%" stop-color="#EF4444" />
          </linearGradient>
        </defs>

        <!-- Spectrum Track -->
        <rect x="10" y="16" width="380" height="12" rx="6" fill="url(#bmi-spectrum-gradient)" opacity="0.85" />

        <!-- Threshold Tick Marks & Numbers -->
        <text x="10" y="42" font-size="10" fill="#94A3B8" class="bmi-tick-label" font-family="system-ui, sans-serif" font-weight="600">15</text>
        <text x="76" y="42" font-size="10" fill="#94A3B8" class="bmi-tick-label" font-family="system-ui, sans-serif" font-weight="600">18.5</text>
        <text x="198" y="42" font-size="10" fill="#94A3B8" class="bmi-tick-label" font-family="system-ui, sans-serif" font-weight="600">25</text>
        <text x="293" y="42" font-size="10" fill="#94A3B8" class="bmi-tick-label" font-family="system-ui, sans-serif" font-weight="600">30</text>
        <text x="375" y="42" font-size="10" fill="#94A3B8" class="bmi-tick-label" font-family="system-ui, sans-serif" font-weight="600">35+</text>

        <!-- Indicator Needle / Pin -->
        <g transform="translate(${10 + (380 * percent / 100)}, 0)">
          <!-- Outer circle -->
          <circle cx="0" cy="22" r="9" fill="#FFFFFF" class="bmi-needle-outer" stroke="#0F172A" stroke-width="2.5" />
          <!-- Inner indicator dot -->
          <circle cx="0" cy="22" r="4.5" fill="#0D9488" />
          <!-- Downward pointer -->
          <polygon points="0,11 -4,5 4,5" class="bmi-needle-pointer" fill="#0F172A" />
        </g>
      </svg>
      <div class="bmi-spectrum-labels">
        <span class="bmi-label-underweight">Underweight</span>
        <span class="bmi-label-normal">Normal (18.5–24.9)</span>
        <span class="bmi-label-overweight">Overweight (25–29.9)</span>
        <span class="bmi-label-obese">Obese (30+)</span>
      </div>
    </div>
  `;
}

