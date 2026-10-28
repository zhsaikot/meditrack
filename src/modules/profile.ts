// src/modules/profile.ts
// MediTrack - Profile & BMI Calculation Module
import { formatNumber, t } from './i18n';

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
 * Generates a modern, non-stretched, responsive segmented visual gauge for BMI
 * Scale runs from 15 to 35.
 */
export function renderBMISpectrumSVG(bmi: number): string {
  const minScale = 15;
  const maxScale = 35;
  const clampedBMI = Math.max(minScale, Math.min(maxScale, bmi || 22));
  
  // Convert BMI to percentage 0..100 on the 15..35 scale (clamped with padding)
  const percent = Math.min(97, Math.max(3, ((clampedBMI - minScale) / (maxScale - minScale)) * 100));

  let pinColor = '#0D9488';
  let pinCategory = t('normal_weight');
  if (clampedBMI < 18.5) {
    pinColor = '#3B82F6';
    pinCategory = t('underweight');
  } else if (clampedBMI <= 24.9) {
    pinColor = '#10B981';
    pinCategory = t('normal_weight');
  } else if (clampedBMI <= 29.9) {
    pinColor = '#F59E0B';
    pinCategory = t('overweight');
  } else {
    pinColor = '#EF4444';
    pinCategory = t('obese');
  }

  const formattedBMI = bmi ? formatNumber(bmi.toFixed(1)) : '--';

  return `
    <div class="bmi-gauge-card-container">
      <div class="bmi-gauge-track-wrap">
        <!-- Floating Live Pin Indicator -->
        <div class="bmi-pin-wrapper" style="left: ${percent}%;">
          <div class="bmi-pin-bubble" style="background-color: ${pinColor}; border-color: ${pinColor};">
            <span class="bmi-pin-val">${formattedBMI}</span>
            <span class="bmi-pin-cat">${pinCategory}</span>
          </div>
          <div class="bmi-pin-needle" style="border-top-color: ${pinColor};"></div>
          <div class="bmi-pin-dot" style="background-color: ${pinColor};"></div>
        </div>

        <!-- Segmented Colored Pill Track (15 to 35) -->
        <div class="bmi-segmented-bar">
          <div class="bmi-segment seg-underweight" style="width: 17.5%;" title="${t('underweight')} (< 18.5)"></div>
          <div class="bmi-segment seg-normal" style="width: 32.5%;" title="${t('normal_weight')} (18.5 – 24.9)"></div>
          <div class="bmi-segment seg-overweight" style="width: 25%;" title="${t('overweight')} (25 – 29.9)"></div>
          <div class="bmi-segment seg-obese" style="width: 25%;" title="${t('obese')} (≥ 30)"></div>
        </div>

        <!-- Scale Ticks (Aligned to segments) -->
        <div class="bmi-ticks-row">
          <span class="bmi-tick" style="left: 0%; transform: translateX(0%);">${formatNumber(15)}</span>
          <span class="bmi-tick" style="left: 17.5%;">${formatNumber(18.5)}</span>
          <span class="bmi-tick" style="left: 50%;">${formatNumber(25)}</span>
          <span class="bmi-tick" style="left: 75%;">${formatNumber(30)}</span>
          <span class="bmi-tick" style="left: 100%; transform: translateX(-100%);">${formatNumber(35)}+</span>
        </div>
      </div>

      <!-- Modern Legend Pills -->
      <div class="bmi-category-legend">
        <span class="bmi-legend-pill blue"><span class="dot"></span> ${t('underweight')}</span>
        <span class="bmi-legend-pill green"><span class="dot"></span> ${t('normal_weight')}</span>
        <span class="bmi-legend-pill orange"><span class="dot"></span> ${t('overweight')}</span>
        <span class="bmi-legend-pill red"><span class="dot"></span> ${t('obese')}</span>
      </div>
    </div>
  `;
}

export const renderBMISpectrumGauge = renderBMISpectrumSVG;

