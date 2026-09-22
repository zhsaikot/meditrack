// MediTrack - Internationalization (i18n) Module (English & Bangla)

export type Language = 'en' | 'bn';

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

export function getLanguage(): Language {
  return currentLanguage;
}

// Convert English numbers to Bengali numerals if language is 'bn'
export function formatNumber(num: number | string, lang: Language = currentLanguage): string {
  const str = String(num);
  if (lang !== 'bn') return str;
  const bnDigits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return str.replace(/\d/g, d => bnDigits[d] || d);
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Branding
    brand_eyebrow: 'PERSONAL HEALTH DASHBOARD',
    brand_name: 'MediTrack',
    brand_subtitle: 'Your complete, private health companion',
    switch_language: 'বাংলায় দেখুন',
    profile_btn_title: 'Open Profile & Settings',
    reminders_active: 'Reminders Active',
    enable_reminders: 'Enable Reminders',
    doctor_report_title: 'Print Doctor Health Report',
    toggle_theme_title: 'Toggle Dark Mode',
    export_backup_title: 'Export Backup (JSON)',
    import_backup_title: 'Import Backup (JSON)',
    
    // Welcome Panel
    good_to_see_you: 'GOOD TO SEE YOU',
    welcome_back: 'Welcome back, {name}.',
    take_day_step: 'Take the day one small step at a time.',
    next_up_prefix: 'Next up: ',
    at_time: ' at ',
    schedule_clear: 'Your medication schedule is clear for today.',
    
    // Overview / Stats Card (2x2)
    overview_eyebrow: 'AT A GLANCE',
    overview_title: "Today's overview",
    live_badge: 'LIVE',
    stat_adherence: 'Medicine Adherence',
    stat_water: 'Water Intake',
    stat_sleep: 'Avg Sleep',
    stat_streak: 'Check-in Streak',
    days_unit: 'days',
    ml_unit: 'ml',
    hours_unit: 'h',

    // Quick Actions
    quick_log_eyebrow: 'QUICK LOG',
    quick_log_title: 'Record vitals, sleep & visits',
    log_vitals_btn: '❤️ Log Vitals',
    log_sleep_btn: '😴 Log Sleep',
    add_visit_btn: '📅 Add Visit',

    // Hydration Card
    hydration_eyebrow: 'BODY RHYTHM',
    hydration_title: 'Hydration',
    goal_badge: '⚙️ {goal}ml Goal',
    water_intro_at_goal: 'Small sips add up. You are at your daily goal! 🎉',
    water_intro_remaining: 'Small sips add up. You are {remaining}ml from your goal.',
    add_250ml: 'Add 250ml',
    remove_250ml: '−',

    // BMI Card
    bmi_eyebrow: 'BODY COMPOSITION',
    bmi_title: 'Body Mass Index (BMI)',
    current_bmi: 'Current BMI',
    recorded_weight: 'Recorded Weight',
    healthy_weight_range: 'Healthy Weight Range',
    target_bmi_range: 'Target: 18.5 – 24.9',
    height_prefix: 'Height: {height} cm',
    who_standard: 'WHO standard scale',
    edit_profile_btn: 'Edit Profile',
    underweight: 'Underweight',
    normal_weight: 'Normal weight',
    overweight: 'Overweight',
    obese: 'Obese',
    advice_underweight: 'Your BMI is below the standard range. A target weight of {min}–{max} kg is recommended.',
    advice_normal: 'Great job! Your weight is in the healthy range ({min}–{max} kg). Keep up the good work!',
    advice_overweight: 'You are approximately {diff} kg above the healthy range ({min}–{max} kg). Light exercise and hydration help!',
    advice_obese: 'Your BMI indicates obesity. Consider discussing a supportive nutrition and wellness plan with your doctor.',

    // Mental Check-in
    mental_eyebrow: 'MENTAL CHECK-IN',
    mental_title: 'How are you feeling?',
    rate_mood_prompt: 'Rate your mood today:',
    any_symptoms_prompt: 'Any symptoms?',
    journal_placeholder: "Add journal notes or how you're feeling...",
    save_checkin_btn: "Save today's check-in",
    mood_terrible: 'Terrible',
    mood_bad: 'Bad',
    mood_okay: 'Okay',
    mood_good: 'Good',
    mood_great: 'Great',

    // Symptoms
    symptom_headache: 'Headache',
    symptom_fatigue: 'Fatigue',
    symptom_nausea: 'Nausea',
    symptom_pain: 'Pain',
    symptom_anxiety: 'Anxiety',
    symptom_dizziness: 'Dizziness',
    symptom_stress: 'Stress',
    symptom_insomnia: 'Insomnia',

    // Behavioral Trends
    trends_eyebrow: 'WEEKLY REVIEW',
    trends_title: 'Behavioral Trends',
    chart_hydration_title: 'Hydration vs Goal (Last 7 Days)',
    chart_goal_met: 'Goal Met',
    chart_med_sleep_title: 'Medicine vs Sleep Adherence',
    chart_legend_med: 'Med %',
    chart_legend_sleep: 'Sleep (hrs)',

    // Routine & Add Medicine
    routine_eyebrow: 'YOUR ROUTINE',
    routine_title: 'Add a medicine',
    med_name_ph: 'Medicine Name (e.g., Metformin)',
    med_dosage_ph: 'Dosage (e.g., 500mg)',
    doses_per_day_label: 'Doses per day:',
    dose_time_label: 'Dose Time:',
    dose_1_time: '1 time a day',
    dose_2_times: '2 times a day',
    dose_3_times: '3 times a day',
    dose_4_times: '4 times a day',
    dose_num_label: 'Dose {num} Time:',
    frequency_label: 'Frequency:',
    freq_daily: 'Daily',
    freq_weekdays: 'Weekdays only',
    freq_weekends: 'Weekends only',
    initial_supply_label: 'Initial Supply:',
    pills_left_ph: 'Pills left',
    add_medicine_btn: 'Add Medicine',

    // Today's Medicines
    schedule_eyebrow: 'SCHEDULE',
    schedule_title: "Today's medicines",
    taken_badge: '{taken} / {total} taken',
    refill_alert_banner: '⚠️ Refill Alert: {count} medication{plural} 5 or fewer doses remaining.',
    empty_meds_title: 'No medicines scheduled for today',
    empty_meds_desc: 'Stay on track with your prescription regimen. Add your daily medications or vitamins to get started.',
    empty_meds_btn: '＋ Add Your First Medicine',
    low_supply_warn: '⚠️ Low supply: {count} dose{plural} left',
    restock_btn: '+30 Refill',
    take_btn_title: 'Mark as taken',
    skip_btn_title: 'Skip today',
    undo_btn_title: 'Undo',
    delete_btn_title: 'Delete medicine',
    dose_tag: 'Dose {index}/{total}',
    next_up_badge: 'Next Up',

    // Consultations & Appointments
    appts_eyebrow: 'CONSULTATIONS',
    appts_title: 'Upcoming Appointments',
    appts_scheduled: '{count} scheduled',
    no_appts: 'No upcoming appointments. Click "Add Visit" above to schedule one.',
    with_doctor: 'with {doctor}',
    delete_appt_title: 'Delete appointment',

    // Vitals & Sleep Summaries
    vitals_eyebrow: 'VITAL SIGNS',
    vitals_title: 'Latest Readings',
    sleep_eyebrow: 'REST & RECOVERY',
    sleep_title: 'Latest Sleep Log',
    duration_label: 'Duration',
    quality_label: 'Quality',
    schedule_label: 'Schedule',

    // Insights Row
    recent_note_eyebrow: 'RECENT NOTE',
    todays_focus_eyebrow: "TODAY'S FOCUS",
    checked_in_today: 'Checked in today.',
    journal_ready: 'Your journal is ready when you are.',
    no_symptoms_logged: 'No symptoms logged',
    mood_label: 'Mood {val}/5',
    build_routine: 'Build your routine',
    all_meds_taken: 'All medicines taken! ✨',
    meds_remaining: '{count} medicine{plural} remaining',
    streak_progress: '{count} days of consistent check-ins.',
    consistency_starts: 'Consistency starts with one step.',

    // Modals
    // Profile Modal
    profile_modal_heading: 'Profile & Health Baseline',
    avatar_change_btn: 'Change photo',
    avatar_remove_btn: 'Remove',
    avatar_hint: 'Stored offline in browser',
    fullname_label: 'Full Name',
    fullname_ph: 'e.g. Alex Morgan',
    blood_type_label: 'Blood Type',
    height_cm_label: 'Height (cm)',
    weight_kg_label: 'Weight (kg)',
    water_goal_label: 'Daily Water Goal (ml)',
    emergency_legend: 'Emergency Contact (Optional)',
    em_name_label: 'Contact Name',
    em_name_ph: 'e.g. Jane Doe',
    em_phone_label: 'Phone Number',
    em_phone_ph: 'e.g. +1 555-0199',
    em_rel_label: 'Relationship',
    em_rel_ph: 'e.g. Spouse, Parent',
    cancel_btn: 'Cancel',
    save_profile_btn: 'Save Profile',

    // Water Goal Modal
    goal_modal_title: 'Custom Water Goal',
    goal_modal_desc: 'Tailor your hydration target to match your personal activity and physician recommendations.',
    quick_presets: 'Quick Presets:',
    target_intake_label: 'Target Daily Intake (ml):',
    save_goal_btn: 'Save Water Goal',

    // Vitals Modal
    vitals_modal_title: 'Record Vital Signs',
    heart_rate_label: 'Heart Rate (bpm)',
    blood_pressure_label: 'Blood Pressure (Systolic/Diastolic)',
    weight_modal_label: 'Weight (kg)',
    temperature_label: 'Temperature (°C)',
    save_vitals_btn: 'Save Vitals',

    // Sleep Modal
    sleep_modal_title: 'Log Sleep',
    bedtime_label: 'Bedtime',
    waketime_label: 'Wake Time',
    sleep_quality_label: 'Sleep Quality (1-5): {stars} Stars',
    save_sleep_btn: 'Save Sleep',

    // Appointment Modal
    appt_modal_title: 'Schedule Doctor Appointment',
    appt_title_field: 'Visit Purpose / Title',
    appt_title_ph: 'e.g., Annual Health Checkup',
    appt_doctor_field: "Doctor's Name",
    appt_doctor_ph: 'e.g., Dr. Smith',
    appt_location_field: 'Clinic / Hospital Location',
    appt_location_ph: 'e.g., City General Hospital',
    appt_date_field: 'Date',
    appt_time_field: 'Time',
    // Footer
    created_by: 'Created by',
    footer_attribution: 'Created by',

    // Navigation Bar
    nav_medicines: 'Medicines',
    nav_hydration: 'Water',
    nav_vitals: 'Vitals',
    nav_profile: 'Profile',

    // Reminders & Notifications
    water_reminder_title: 'Hydration Reminder 💧',
    water_reminder_body: 'Time to drink a fresh glass of water to stay healthy and hydrated!',
    med_reminder_title: 'Medication Reminder 💊',
    med_reminder_body: 'Time to take your scheduled dose: {name} ({dosage})',
    toast_add_water_btn: '+250ml Water',
    toast_mark_taken_btn: 'Mark Taken',
    toast_water_success: 'Logged 250ml water! 💧',
    toast_med_success: 'Dose marked as taken! ✨',

    // Profile Backup & Restore Section
    backup_section_title: 'Data Backup & Restore',
    backup_section_desc: 'Download your personal health data as JSON or restore from a previous backup file.',
    backup_download_btn: 'Download Backup (JSON)',
    backup_restore_btn: 'Restore Backup File'
  },
  bn: {
    // Header & Branding
    brand_eyebrow: 'ব্যক্তিগত ডিজিটাল স্বাস্থ্য ড্যাশবোর্ড',
    brand_name: 'মেডিট্র্যাক',
    brand_subtitle: 'আপনার দৈনন্দিন ওষুধ, স্বাস্থ্য ও অভ্যাসের সার্বক্ষণিক সঙ্গী',
    switch_language: 'In English',
    profile_btn_title: 'প্রোফাইল ও সেটিংস খুলুন',
    reminders_active: 'অনুস্মারক সক্রিয়',
    enable_reminders: 'অনুস্মারক চালু করুন',
    doctor_report_title: 'চিকিৎসক রিপোর্ট প্রিন্ট করুন',
    toggle_theme_title: 'ডার্ক মোড পরিবর্তন করুন',
    export_backup_title: 'ব্যাকআপ ডাউনলোড (JSON)',
    import_backup_title: 'ব্যাকআপ আপলোড (JSON)',

    // Welcome Panel
    good_to_see_you: 'আপনাকে স্বাগতম',
    welcome_back: 'স্বাগতম, {name}।',
    take_day_step: 'সুস্থতার দিকে ধাপে ধাপে এগিয়ে চলুন।',
    next_up_prefix: 'পরবর্তী ওষুধ: ',
    at_time: ', সময়: ',
    schedule_clear: 'আজকের ওষুধের সময়সূচি সম্পূর্ণ হয়েছে।',

    // Overview / Stats Card (2x2)
    overview_eyebrow: 'এক নজরে',
    overview_title: 'আজকের সামগ্রিক অবস্থা',
    live_badge: 'লাইভ',
    stat_adherence: 'ওষুধ সেবনের হার',
    stat_water: 'পানি পানের পরিমাণ',
    stat_sleep: 'গড় ঘুম',
    stat_streak: 'ধারাবাহিকতা',
    days_unit: 'দিন',
    ml_unit: 'মিলি',
    hours_unit: 'ঘণ্টা',

    // Quick Actions
    quick_log_eyebrow: 'কুইক লগ',
    quick_log_title: 'ভাইটালস, ঘুম ও ভিজিট রেকর্ড করুন',
    log_vitals_btn: '❤️ ভাইটালস রেকর্ড',
    log_sleep_btn: '😴 ঘুমের তথ্য',
    add_visit_btn: '📅 ডাক্তার সাক্ষাৎ',

    // Hydration Card
    hydration_eyebrow: 'শারীরিক ছন্দ',
    hydration_title: 'দৈনন্দিন পানি গ্রহণ',
    goal_badge: '⚙️ {goal} মিলি লক্ষ্যমাত্রা',
    water_intro_at_goal: 'অভিনন্দন! আপনি আজকের পানি পানের লক্ষ্যমাত্রা পূরণ করেছেন! 🎉',
    water_intro_remaining: 'অল্প অল্প করে পানি পান করুন। লক্ষ্যমাত্রায় পৌঁছাতে আরও {remaining} মিলি প্রয়োজন।',
    add_250ml: '২৫০ মিলি যোগ করুন',
    remove_250ml: '−',

    // BMI Card
    bmi_eyebrow: 'শারীরিক গঠন ও বিএমআই',
    bmi_title: 'বডি ম্যাস ইনডেক্স (BMI)',
    current_bmi: 'বর্তমান বিএমআই',
    recorded_weight: 'নির্ধারিত ওজন',
    healthy_weight_range: 'সুস্থ ওজনের পরিধি',
    target_bmi_range: 'আদর্শ মান: ১৮.৫ – ২৪.৯',
    height_prefix: 'উচ্চতা: {height} সেমি',
    who_standard: 'বিশ্ব স্বাস্থ্য সংস্থা (WHO) মানদণ্ড',
    edit_profile_btn: 'প্রোফাইল সম্পাদন',
    underweight: 'কম ওজন',
    normal_weight: 'স্বাভাবিক ওজন',
    overweight: 'অতিরিক্ত ওজন',
    obese: 'স্থূলতা',
    advice_underweight: 'আপনার ওজন স্বাভাবিকের চেয়ে কম। আদর্শ ওজনের লক্ষ্যমাত্রা {min}–{max} কেজি। পুষ্টিকর খাবার গ্রহণ করুন।',
    advice_normal: 'চমৎকার! আপনার ওজন সম্পূর্ণ সুস্থ স্বাভাবিক সীমায় আছে ({min}–{max} কেজি)। এটি বজায় রাখুন!',
    advice_overweight: 'আপনি স্বাভাবিক ওজনের চেয়ে প্রায় {diff} কেজি ওপরে আছেন ({min}–{max} কেজি)। নিয়মিত ব্যায়াম ও খাদ্যাভ্যাস নিয়ন্ত্রণ করুন।',
    advice_obese: 'আপনার বিএমআই স্থূলতার নির্দেশক। বিশেষজ্ঞ চিকিৎসকের পরামর্শ অনুযায়ী সুষম খাদ্য ও ব্যায়াম রুটিন শুরু করুন।',

    // Mental Check-in
    mental_eyebrow: 'মানসিক পর্যবেক্ষণ',
    mental_title: 'আজ আপনি কেমন অনুভব করছেন?',
    rate_mood_prompt: 'আজকের মানসিক অবস্থা নির্ধারণ করুন:',
    any_symptoms_prompt: 'কোনো শারীরিক উপসর্গ আছে কি?',
    journal_placeholder: 'আজকের দিনের অনুভূতি বা ডায়েরির নোট লিখুন...',
    save_checkin_btn: 'আজকের তথ্য সংরক্ষণ করুন',
    mood_terrible: 'খুব খারাপ',
    mood_bad: 'খারাপ',
    mood_okay: 'মোটামুটি',
    mood_good: 'ভালো',
    mood_great: 'চমৎকার',

    // Symptoms
    symptom_headache: 'মাথাব্যথা',
    symptom_fatigue: 'ক্লান্তি',
    symptom_nausea: 'বমি ভাব',
    symptom_pain: 'শরীরে ব্যথা',
    symptom_anxiety: 'উদ্বেগ',
    symptom_dizziness: 'মাথা ঘোরা',
    symptom_stress: 'মানসিক চাপ',
    symptom_insomnia: 'অনিদ্রা',

    // Behavioral Trends
    trends_eyebrow: 'সাপ্তাহিক পর্যালোচনা',
    trends_title: 'আচরণগত প্রবণতা',
    chart_hydration_title: 'পানি গ্রহণ বনাম লক্ষ্যমাত্রা (গত ৭ দিন)',
    chart_goal_met: 'লক্ষ্যমাত্রা অর্জিত',
    chart_med_sleep_title: 'ওষুধ সেবন বনাম ঘুমের তুলনা',
    chart_legend_med: 'ওষুধ %',
    chart_legend_sleep: 'ঘুম (ঘণ্টা)',

    // Routine & Add Medicine
    routine_eyebrow: 'নিয়মিত রুটিন',
    routine_title: 'নতুন ওষুধ যোগ করুন',
    med_name_ph: 'ওষুধের নাম (যেমন: প্যারাসিটামল)',
    med_dosage_ph: 'ডোজের মাত্রা (যেমন: ৫০০মিগ্রা)',
    doses_per_day_label: 'প্রতিদিন ডোজের সংখ্যা:',
    dose_time_label: 'ডোজের সময়:',
    dose_1_time: 'দিনে ১ বার',
    dose_2_times: 'দিনে ২ বার',
    dose_3_times: 'দিনে ৩ বার',
    dose_4_times: 'দিনে ৪ বার',
    dose_num_label: '{num}নং ডোজের সময়:',
    frequency_label: 'পুনরাবৃত্তি:',
    freq_daily: 'প্রতিদিন',
    freq_weekdays: 'শুধুমাত্র কাজের দিন',
    freq_weekends: 'শুধুমাত্র ছুটির দিন',
    initial_supply_label: 'প্রাথমিক মজুদ:',
    pills_left_ph: 'পিলের সংখ্যা',
    add_medicine_btn: 'ওষুধ সংরক্ষণ করুন',

    // Today's Medicines
    schedule_eyebrow: 'সময়সূচি',
    schedule_title: 'আজকের ওষুধসমূহ',
    taken_badge: '{taken} / {total} টি গ্রহণ করা হয়েছে',
    refill_alert_banner: '⚠️ রিফিল সতর্কতা: {count}টি ওষুধের মজুদ ৫ বা তার কম ডোজে নেমে এসেছে।',
    empty_meds_title: 'আজকের জন্য কোনো ওষুধ নির্ধারিত নেই',
    empty_meds_desc: 'প্রেসক্রিপশন অনুযায়ী সুস্থ থাকতে আপনার প্রতিদিনের ওষুধ ও ভিটামিন যোগ করে শুরু করুন।',
    empty_meds_btn: '＋ প্রথম ওষুধ যোগ করুন',
    low_supply_warn: '⚠️ মজুদ কম: মাত্র {count}টি ডোজ বাকি আছে',
    restock_btn: '+৩০ রিফিল',
    take_btn_title: 'গ্রহণ করা হয়েছে',
    skip_btn_title: 'আজকের মতো বাদ দিন',
    undo_btn_title: 'পূর্বাবস্থায় ফেরান',
    delete_btn_title: 'ওষুধ মুছুন',
    dose_tag: 'ডোজ {index}/{total}',
    next_up_badge: 'পরবর্তী ডোজ',

    // Consultations & Appointments
    appts_eyebrow: 'পরামর্শ ও সাক্ষাৎ',
    appts_title: 'আসন্ন ডাক্তার অ্যাপয়েন্টমেন্ট',
    appts_scheduled: '{count}টি নির্ধারিত',
    no_appts: 'কোনো আসন্ন অ্যাপয়েন্টমেন্ট নেই। নতুন অ্যাপয়েন্টমেন্ট যোগ করতে ওপরে "ডাক্তার সাক্ষাৎ" চাপুন।',
    with_doctor: 'চিকিৎসক: {doctor}',
    delete_appt_title: 'অ্যাপয়েন্টমেন্ট মুছুন',

    // Vitals & Sleep Summaries
    vitals_eyebrow: 'ভাইটাল সাইন',
    vitals_title: 'সর্বশেষ পরিমাপ',
    sleep_eyebrow: 'বিশ্রাম ও ঘুম',
    sleep_title: 'সর্বশেষ ঘুমের হিসাব',
    duration_label: 'সময়কাল',
    quality_label: 'গুণগত মান',
    schedule_label: 'সময়সূচি',

    // Insights Row
    recent_note_eyebrow: 'সাম্প্রতিক নোট',
    todays_focus_eyebrow: 'আজকের মনোযোগ',
    checked_in_today: 'আজকের চেক-ইন সম্পন্ন।',
    journal_ready: 'আপনার স্বাস্থ্য ডায়েরি প্রস্তুত।',
    no_symptoms_logged: 'কোনো উপসর্গ রেকর্ড করা হয়নি',
    mood_label: 'মেজাজ {val}/৫',
    build_routine: 'স্বাস্থ্য রুটিন গড়ে তুলুন',
    all_meds_taken: 'আজকের সব ওষুধ খাওয়া সম্পন্ন! ✨',
    meds_remaining: 'আরও {count}টি ওষুধ গ্রহণ বাকি আছে',
    streak_progress: 'টানা {count} দিন নিয়মিত চেক-ইন সম্পন্ন।',
    consistency_starts: 'নিয়মানুবর্তিতাই সুস্থতার চাবিকাঠি।',

    // Modals
    // Profile Modal
    profile_modal_heading: 'প্রোফাইল ও স্বাস্থ্য বেসলাইন',
    avatar_change_btn: 'ছবি পরিবর্তন',
    avatar_remove_btn: 'মুছুন',
    avatar_hint: 'ব্রাউজারে নিরাপদে সংরক্ষিত',
    fullname_label: 'পুরো নাম',
    fullname_ph: 'যেমন: রফিকুল ইসলাম',
    blood_type_label: 'রক্তের গ্রুপ',
    height_cm_label: 'উচ্চতা (সেমি)',
    weight_kg_label: 'ওজন (কেজি)',
    water_goal_label: 'দৈনিক পানি পানের লক্ষ্য (মিলি)',
    emergency_legend: 'জরুরি যোগাযোগ (ঐচ্ছিক)',
    em_name_label: 'যোগাযোগকারীর নাম',
    em_name_ph: 'যেমন: সুমাইয়া আক্তার',
    em_phone_label: 'ফোন নম্বর',
    em_phone_ph: 'যেমন: +৮৮০ ১৭১২-৩৪৫৬৭৮',
    em_rel_label: 'সম্পর্ক',
    em_rel_ph: 'যেমন: স্ত্রী, অভিভাবক',
    cancel_btn: 'বাতিল',
    save_profile_btn: 'প্রোফাইল সংরক্ষণ',

    // Water Goal Modal
    goal_modal_title: 'পানি পানের লক্ষ্য নির্ধারণ',
    goal_modal_desc: 'আপনার দৈনন্দিন শারীরিক পরিশ্রম ও চিকিৎসকের পরামর্শ অনুযায়ী পানি পানের লক্ষ্যমাত্রা নির্ধারণ করুন।',
    quick_presets: 'দ্রুত নির্বাচন:',
    target_intake_label: 'দৈনিক লক্ষ্যমাত্রা (মিলি):',
    save_goal_btn: 'লক্ষ্যমাত্রা সংরক্ষণ',

    // Vitals Modal
    vitals_modal_title: 'ভাইটাল সাইন রেকর্ড করুন',
    heart_rate_label: 'হার্ট রেট (বিপিএম)',
    blood_pressure_label: 'রক্তচাপ (সিস্টোলিক/ডায়াস্টোলিক)',
    weight_modal_label: 'ওজন (কেজি)',
    temperature_label: 'তাপমাত্রা (°সে)',
    save_vitals_btn: 'ভাইটালস সংরক্ষণ',

    // Sleep Modal
    sleep_modal_title: 'ঘুমের তথ্য রেকর্ড করুন',
    bedtime_label: 'ঘুমানোর সময়',
    waketime_label: 'ঘুম থেকে ওঠার সময়',
    sleep_quality_label: 'ঘুমের মান (১-৫): {stars} স্টার',
    save_sleep_btn: 'ঘুমের তথ্য সংরক্ষণ',

    // Appointment Modal
    appt_modal_title: 'নতুন ডাক্তার অ্যাপয়েন্টমেন্ট',
    appt_title_field: 'সাক্ষাতের উদ্দেশ্য / শিরোনাম',
    appt_title_ph: 'যেমন: বার্ষিক স্বাস্থ্য পরীক্ষা',
    appt_doctor_field: 'চিকিৎসকের নাম',
    appt_doctor_ph: 'যেমন: ডা. আহমেদ',
    appt_location_field: 'হাসপাতাল / চেম্বারের ঠিকানা',
    appt_location_ph: 'যেমন: স্কয়ার হাসপাতাল',
    appt_date_field: 'তারিখ',
    appt_time_field: 'সময়',
    // Footer
    created_by: 'তৈরি করেছেন',
    footer_attribution: 'তৈরি করেছেন',

    // Navigation Bar
    nav_medicines: 'ওষুধ',
    nav_hydration: 'পানি',
    nav_vitals: 'ভাইটালস',
    nav_profile: 'প্রোফাইল',

    // Reminders & Notifications
    water_reminder_title: 'পানি পানের রিমাইন্ডার 💧',
    water_reminder_body: 'সুস্থ ও সতেজ থাকতে এক গ্লাস পানি পান করার সময় হয়েছে!',
    med_reminder_title: 'ওষুধ খাওয়ার রিমাইন্ডার 💊',
    med_reminder_body: 'আপনার ওষুধ খাওয়ার সময় হয়েছে: {name} ({dosage})',
    toast_add_water_btn: '+২৫০মিলি পানি',
    toast_mark_taken_btn: 'খেয়েছি ✓',
    toast_water_success: '২৫০ মিলি পানি যোগ করা হয়েছে! 💧',
    toast_med_success: 'ওষুধ গ্রহণ সম্পন্ন হয়েছে! ✨',

    // Profile Backup & Restore Section
    backup_section_title: 'ডাটা ব্যাকআপ ও রিস্টোর',
    backup_section_desc: 'আপনার সম্পূর্ণ স্বাস্থ্য তথ্য ব্যাকআপ ডাউনলোড করুন অথবা পূর্বের ব্যাকআপ ফাইল থেকে রিস্টোর করুন।',
    backup_download_btn: 'ডাটা ব্যাকআপ ডাউনলোড (JSON)',
    backup_restore_btn: 'ব্যাকআপ ফাইল রিস্টোর করুন'
  }
};

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = translations[currentLanguage] || translations.en;
  let text = dict[key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      const formattedVal = typeof v === 'number' ? formatNumber(v, currentLanguage) : String(v);
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), formattedVal);
    }
  }
  return text;
}

