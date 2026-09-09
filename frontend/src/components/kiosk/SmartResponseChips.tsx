'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { playBeep } from '@/lib/sound';
import type { SmartChip } from '@/types/kiosk';

interface SmartResponseChipsProps {
  question: string;
  targetField?: string | null;
  onSelect: (value: string) => void;
}

// Map target field or question keywords to contextual chip sets
function getChips(question: string, targetField?: string | null): SmartChip[] {
  // 1. Direct targetField mapping (100% deterministic when provided by backend)
  if (targetField) {
    switch (targetField) {
      case 'character':
        return [
          { label: 'Pressure / Crushing', value: 'It feels like heavy pressure and crushing tightness' },
          { label: 'Sharp / Stabbing', value: 'It feels sharp and stabbing' },
          { label: 'Dull / Aching', value: 'It feels dull and aching' },
          { label: 'Burning / Acidic', value: 'It feels like burning' },
        ];
      case 'severity':
        return [
          { label: 'Mild (1–3)', value: 'Mild, around 2 out of 10' },
          { label: 'Moderate (4–6)', value: 'Moderate, around 5 out of 10' },
          { label: 'Severe (7–9)', value: 'Severe, around 8 out of 10' },
          { label: 'Worst (10/10)', value: 'Worst pain of my life, 10 out of 10' },
        ];
      case 'onset':
        return [
          { label: 'Just today', value: 'It started today, just a few hours ago' },
          { label: '2–3 days ago', value: 'It started 2 to 3 days ago' },
          { label: 'About a week', value: 'It has been about a week' },
          { label: 'Months / Chronic', value: 'It has been going on for several months' },
        ];
      case 'site':
        return [
          { label: 'Center of chest', value: 'In the middle of my chest, behind the breastbone' },
          { label: 'Left side of chest', value: 'On the left side of my chest' },
          { label: 'Upper abdomen', value: 'In the upper part of my abdomen' },
          { label: 'Wide area', value: 'Spread across my entire chest' },
        ];
      case 'radiation':
        return [
          { label: 'Stays in chest', value: 'No, it stays in one place and does not spread' },
          { label: 'Left arm / Shoulder', value: 'Yes, it spreads to my left arm and shoulder' },
          { label: 'Neck / Jaw', value: 'Yes, it spreads to my neck and jaw' },
          { label: 'Back', value: 'Yes, it spreads to my back' },
        ];
      case 'timing':
        return [
          { label: 'Constant', value: 'It is constant and does not go away' },
          { label: 'Comes and goes', value: 'It comes and goes in waves' },
          { label: 'Morning only', value: 'It is mainly in the morning' },
          { label: 'After activity', value: 'It happens after physical activity' },
        ];
      case 'exacerbating_factors':
        return [
          { label: 'Exertion / Walking', value: 'It gets worse with physical exertion and walking' },
          { label: 'Eating', value: 'It gets worse after eating' },
          { label: 'Lying down', value: 'It gets worse when I lie down' },
          { label: 'Nothing makes it worse', value: 'Nothing in particular makes it worse' },
        ];
      case 'relieving_factors':
        return [
          { label: 'Rest', value: 'Rest makes it a little better' },
          { label: 'Medications', value: 'Taking medication helps' },
          { label: 'Antacid / Food', value: 'Eating or taking antacid helps' },
          { label: 'Nothing helps', value: 'Nothing makes it better' },
        ];
      case 'associated_symptoms':
        return [
          { label: 'Breathlessness & Sweat', value: 'I have shortness of breath and cold sweating' },
          { label: 'Nausea / Dizziness', value: 'I feel nauseous and dizzy' },
          { label: 'Palpitations', value: 'I feel my heart racing and fluttering' },
          { label: 'No other symptoms', value: 'No other symptoms, just the main complaint' },
        ];
      case 'conditions':
        return [
          { label: 'None', value: 'No, I have no known medical conditions' },
          { label: 'Diabetes', value: 'Yes, I have type 2 diabetes' },
          { label: 'Hypertension (BP)', value: 'Yes, I have high blood pressure' },
          { label: 'Heart disease', value: 'Yes, I have heart disease' },
        ];
      case 'surgeries':
        return [
          { label: 'No surgeries', value: 'No, I have never had any surgeries' },
          { label: 'Appendix removed', value: 'Yes, I had my appendix removed' },
          { label: 'Heart surgery', value: 'Yes, I have had heart surgery' },
          { label: 'Other past surgery', value: 'Yes, I have had an operation in the past' },
        ];
      case 'medications':
        return [
          { label: 'No medications', value: 'No, I am not taking any medications' },
          { label: 'Metformin / Diabetes', value: 'Yes, I take Metformin for diabetes' },
          { label: 'BP medications', value: 'Yes, I take blood pressure medications' },
          { label: 'Multiple medications', value: 'Yes, I take several daily medications' },
        ];
      case 'allergies':
        return [
          { label: 'No known allergies', value: 'No, I have no known allergies' },
          { label: 'Penicillin', value: 'Yes, I am allergic to Penicillin' },
          { label: 'Sulfa drugs', value: 'Yes, I am allergic to Sulfa drugs' },
          { label: 'Food allergies', value: 'Yes, I have food allergies' },
        ];
      case 'family_history':
        return [
          { label: 'No family history', value: 'No, there are no significant medical conditions in my family' },
          { label: 'Heart disease', value: 'Yes, my father had heart disease' },
          { label: 'Diabetes', value: 'Yes, diabetes runs in my family' },
          { label: 'Cancer', value: 'Yes, there is cancer history in my family' },
        ];
      case 'smoking':
        return [
          { label: 'Never smoked', value: 'No, I have never smoked' },
          { label: 'Current smoker', value: 'Yes, I currently smoke' },
          { label: 'Ex-smoker', value: 'I used to smoke but quit' },
        ];
      case 'alcohol':
        return [
          { label: 'No alcohol', value: 'No, I do not drink alcohol' },
          { label: 'Occasionally', value: 'Occasionally, on weekends' },
          { label: 'Regularly', value: 'Yes, I drink alcohol regularly' },
        ];
      case 'diet':
        return [
          { label: 'Vegetarian', value: 'I follow a vegetarian diet' },
          { label: 'Non-vegetarian', value: 'I eat non-vegetarian food' },
          { label: 'Mixed / Balanced', value: 'Balanced mixed diet' },
        ];
      case 'occupation':
        return [
          { label: 'Office / Desk job', value: 'I work at a desk in an office' },
          { label: 'Manual labor / Field', value: 'Physical and field labor' },
          { label: 'Homemaker', value: 'Homemaker' },
          { label: 'Retired', value: 'Retired' },
        ];
      case 'living_situation':
        return [
          { label: 'With family / spouse', value: 'I live with my family' },
          { label: 'Alone', value: 'I live alone' },
        ];
      case 'cardiovascular':
      case 'respiratory':
      case 'gastrointestinal':
      case 'neurological':
      case 'musculoskeletal':
        return [
          { label: 'None / Normal', value: 'No symptoms in this area, completely normal' },
          { label: 'Yes, mild symptoms', value: 'Yes, I have noticed some mild symptoms' },
          { label: 'Not sure', value: 'I am not sure' },
        ];
    }
  }

  // 2. Keyword fallback if targetField is not provided
  const q = question.toLowerCase();

  // Character / quality
  if (
    q.includes('feel like') ||
    q.includes('feels like') ||
    q.includes('feel') ||
    q.includes('describe what') ||
    q.includes('describe the') ||
    q.includes('character') ||
    q.includes('nature') ||
    q.includes('sharp') ||
    q.includes('dull') ||
    q.includes('burning') ||
    q.includes('crushing') ||
    q.includes('pressure')
  ) {
    return [
      { label: 'Pressure / Crushing', value: 'It feels like heavy pressure and crushing tightness' },
      { label: 'Sharp / Stabbing', value: 'It feels sharp and stabbing' },
      { label: 'Dull / Aching', value: 'It feels dull and aching' },
      { label: 'Burning / Acidic', value: 'It feels like burning' },
    ];
  }

  // Severity
  if (q.includes('scale') || q.includes('severe') || q.includes('1 to 10') || q.includes('how bad')) {
    return [
      { label: 'Mild (1–3)', value: 'Mild, around 2 out of 10' },
      { label: 'Moderate (4–6)', value: 'Moderate, around 5 out of 10' },
      { label: 'Severe (7–9)', value: 'Severe, around 8 out of 10' },
      { label: 'Worst (10/10)', value: 'Worst pain of my life, 10 out of 10' },
    ];
  }

  // Onset / timing
  if (q.includes('when did') || q.includes('how long') || q.includes('started') || q.includes('began')) {
    return [
      { label: 'Just today', value: 'It started today, just a few hours ago' },
      { label: '2–3 days ago', value: 'It started 2 to 3 days ago' },
      { label: 'About a week', value: 'It has been about a week' },
      { label: 'Months / Chronic', value: 'It has been going on for several months' },
    ];
  }

  // Allergies
  if (q.includes('allerg')) {
    return [
      { label: 'No known allergies', value: 'No, I have no known allergies' },
      { label: 'Penicillin', value: 'Yes, I am allergic to Penicillin' },
      { label: 'Sulfa drugs', value: 'Yes, I am allergic to Sulfa drugs' },
      { label: 'Food allergies', value: 'Yes, I have food allergies' },
    ];
  }

  // Medications
  if (q.includes('medic') || q.includes('taking') || q.includes('tablet') || q.includes('drug')) {
    return [
      { label: 'No medications', value: 'No, I am not taking any medications' },
      { label: 'Metformin / Diabetic', value: 'Yes, I take Metformin for diabetes' },
      { label: 'BP medications', value: 'Yes, I take blood pressure medications' },
      { label: 'Multiple / Unsure', value: 'Yes, I take several medications but I am not sure of all names' },
    ];
  }

  // Surgeries
  if (q.includes('surger') || q.includes('operat') || q.includes('procedure')) {
    return [
      { label: 'No surgeries', value: 'No, I have never had any surgeries' },
      { label: 'Appendix removed', value: 'Yes, I had my appendix removed' },
      { label: 'Heart surgery', value: 'Yes, I have had heart surgery' },
      { label: 'Yes, other surgery', value: 'Yes, I have had an operation in the past' },
    ];
  }

  // Medical conditions
  if (q.includes('condition') || q.includes('diabetes') || q.includes('pressure') || q.includes('diagnos')) {
    return [
      { label: 'None', value: 'No, I have no known medical conditions' },
      { label: 'Diabetes', value: 'Yes, I have type 2 diabetes' },
      { label: 'Hypertension', value: 'Yes, I have high blood pressure' },
      { label: 'Heart disease', value: 'Yes, I have heart disease' },
    ];
  }

  // Radiation / spread
  if (q.includes('spread') || q.includes('radiat') || q.includes('anywhere else')) {
    return [
      { label: 'Stays in one place', value: 'No, it stays in one place and does not spread' },
      { label: 'Left arm / Shoulder', value: 'Yes, it spreads to my left arm and shoulder' },
      { label: 'Back', value: 'Yes, it spreads to my back' },
      { label: 'Neck / Jaw', value: 'Yes, it spreads to my neck and jaw' },
    ];
  }

  // Relieving / better
  if (
    q.includes('makes it better') ||
    q.includes('make it better') ||
    q.includes('gives relief') ||
    q.includes('give relief') ||
    q.includes('give you relief') ||
    q.includes('reliev') ||
    q.includes('ease the') ||
    q.includes('helps ease')
  ) {
    return [
      { label: 'Rest', value: 'Rest makes it a little better' },
      { label: 'Medications', value: 'Taking medication helps' },
      { label: 'Antacid / Food', value: 'Eating or taking antacid helps' },
      { label: 'Nothing helps', value: 'Nothing makes it better' },
    ];
  }

  // Generic fallback
  return [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
    { label: 'Not sure', value: 'I am not sure' },
  ];
}

export function SmartResponseChips({ question, targetField, onSelect }: SmartResponseChipsProps) {
  const chips = getChips(question, targetField);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (chip: SmartChip) => {
    setSelected(chip.value);
    playBeep();
    onSelect(chip.value);
  };

  return (
    <div className="px-4 py-3 border-t border-clinical-muted bg-clinical-light">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Quick Responses
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => handleSelect(chip)}
            disabled={selected !== null}
            className={cn(
              'px-4 py-2.5 rounded-xl border text-sm font-medium touch-target transition-all duration-150',
              selected === chip.value
                ? 'bg-teal-600 text-white border-teal-600 scale-95'
                : 'bg-white text-slate-700 border-clinical-muted hover:border-teal-400 hover:bg-teal-50 active:scale-95'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
