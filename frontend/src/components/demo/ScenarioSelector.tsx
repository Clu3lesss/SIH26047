'use client';

import { useState } from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { useDoctorStore } from '@/store/doctorStore';
import type { PatientHistoryState, RedFlagResult } from '@/types/intake';
import type { QueueEntry } from '@/types/kiosk';
import { AlertTriangle, Play, RefreshCw, Sparkles } from 'lucide-react';
import { playSuccess } from '@/lib/sound';

export function ScenarioSelector() {
  const { initSession, addAIMessage, addPatientMessage, setIntakeResponse } = useKioskStore();
  const { enqueuePatient, selectPatient } = useDoctorStore();
  const [selectedScenario, setSelectedScenario] = useState('case_a');

  const handleLoadScenario = () => {
    playSuccess();

    if (selectedScenario === 'case_a') {
      // Case A: Acute Coronary Syndrome (High Urgency Red-Flag)
      const sessionId = 'DEMO-ACS-8821';
      const patient = {
        name: 'Ramesh Kumar',
        age: '58',
        sex: 'male' as const,
        mobile: '+91 9876543210',
        abhaId: '91-8273-1928',
        language: 'en' as const,
      };

      const state: PatientHistoryState = {
        session_id: sessionId,
        turn_count: 8,
        status: 'completed',
        chief_complaint: 'Severe crushing chest pain radiating to left arm and jaw with breathlessness',
        hpi: {
          site: 'Substernal / Central chest',
          onset: 'Sudden onset 2 hours ago during morning walk',
          character: 'Crushing, heavy pressure like an elephant sitting on chest',
          radiation: 'Radiating down left arm and into jaw',
          associated_symptoms: ['Shortness of breath', 'Profuse cold sweating (diaphoresis)', 'Nausea'],
          timing: 'Constant, worsening progressively',
          exacerbating_factors: ['Exertion', 'Walking'],
          relieving_factors: ['None, rest does not alleviate'],
          severity: '9/10 excruciating pain',
        },
        conditions: ['Hypertension (10 yrs)', 'Type 2 Diabetes Mellitus (6 yrs)'],
        conditions_asked: true,
        surgeries: ['Appendectomy (1998)'],
        surgeries_asked: true,
        medications: ['Metformin 500mg BD', 'Amlodipine 5mg OD'],
        medications_asked: true,
        allergies: ['Penicillin (causes severe urticarial rash)'],
        allergies_asked: true,
        family_history: [
          { relation: 'Father', condition: 'Died of Myocardial Infarction at age 52' },
        ],
        family_history_asked: true,
        social_history: {
          diet: 'Mixed vegetarian/non-vegetarian',
          smoking: '10 pack-years (current smoker)',
          alcohol: 'Occasional on weekends',
          occupation: 'Bank manager',
          living_situation: 'Lives with spouse and adult son',
        },
        social_history_asked: true,
        review_of_systems: {
          cardiovascular: 'Severe chest tightness, palpitations, diaphoresis',
          respiratory: 'Marked dyspnea on minimal exertion',
          gastrointestinal: 'Mild nausea without vomiting',
          neurological: 'Lightheadedness, no syncope',
          musculoskeletal: 'No joint swelling or trauma',
        },
        review_of_systems_asked: true,
      };

      const redFlag: RedFlagResult = {
        is_flagged: true,
        urgency_tier: 'high',
        reason: 'Suspected Acute Coronary Syndrome / STEMI — Central crushing chest pain radiating to left arm with dyspnea and diaphoresis.',
      };

      const entry: QueueEntry = {
        sessionId,
        tokenNumber: 42,
        patientName: patient.name,
        age: patient.age,
        sex: patient.sex,
        arrivedAt: Date.now() - 4 * 60 * 1000,
        isRedFlag: true,
        urgencyTier: 'high',
        redFlagReason: redFlag.reason,
        isCompleted: true,
        summaryLoaded: false,
      };

      initSession(patient);
      addAIMessage("What brings you in today?");
      addPatientMessage(state.chief_complaint!);
      addAIMessage("Does the pain spread anywhere else?");
      addPatientMessage("Yes, radiating down left arm and into jaw with cold sweat.");
      setIntakeResponse({ state, next_question: null, red_flag: redFlag });
      enqueuePatient(entry, state, redFlag);
      selectPatient(sessionId);
    } else if (selectedScenario === 'case_b') {
      // Case B: Chronic Routine Diabetes
      const sessionId = 'DEMO-DM-4412';
      const patient = {
        name: 'Sunita Sharma',
        age: '62',
        sex: 'female' as const,
        mobile: '+91 9412345678',
        abhaId: '14-3829-5721',
        language: 'en' as const,
      };

      const state: PatientHistoryState = {
        session_id: sessionId,
        turn_count: 7,
        status: 'completed',
        chief_complaint: 'Routine follow-up for diabetes and tingling numbness in both feet',
        hpi: {
          site: 'Bilateral feet and lower legs (glove and stocking distribution)',
          onset: 'Gradual onset over past 6 months',
          character: 'Pins and needles sensation, burning at night',
          radiation: 'None, confined to feet and ankles',
          associated_symptoms: ['Increased thirst', 'Occasional blurred vision'],
          timing: 'Constant tingling, worse at rest and bedtime',
          exacerbating_factors: ['Cold weather', 'Prolonged standing'],
          relieving_factors: ['Gentle massage'],
          severity: '4/10 mild to moderate discomfort',
        },
        conditions: ['Type 2 Diabetes (12 yrs)', 'Dyslipidemia'],
        conditions_asked: true,
        surgeries: ['None'],
        surgeries_asked: true,
        medications: ['Glimepiride 2mg OD', 'Metformin 1000mg BD', 'Atorvastatin 10mg HS'],
        medications_asked: true,
        allergies: [],
        allergies_asked: true,
        family_history: [
          { relation: 'Mother', condition: 'Type 2 Diabetes with kidney disease' },
        ],
        family_history_asked: true,
        social_history: {
          diet: 'Vegetarian, high carbohydrate',
          smoking: 'Non-smoker',
          alcohol: 'Non-drinker',
          occupation: 'Retired school teacher',
          living_situation: 'Lives with husband',
        },
        social_history_asked: true,
        review_of_systems: {
          cardiovascular: 'No chest pain or palpitations',
          respiratory: 'No cough or dyspnea',
          gastrointestinal: 'No abdominal discomfort',
          neurological: 'Peripheral numbness and tingling in bilateral lower limbs',
          musculoskeletal: 'No arthritis or joint pain',
        },
        review_of_systems_asked: true,
      };

      const redFlag: RedFlagResult = {
        is_flagged: false,
        urgency_tier: null,
        reason: null,
      };

      const entry: QueueEntry = {
        sessionId,
        tokenNumber: 43,
        patientName: patient.name,
        age: patient.age,
        sex: patient.sex,
        arrivedAt: Date.now() - 12 * 60 * 1000,
        isRedFlag: false,
        urgencyTier: null,
        redFlagReason: null,
        isCompleted: true,
        summaryLoaded: false,
      };

      initSession(patient);
      addAIMessage("What brings you in today?");
      addPatientMessage(state.chief_complaint!);
      setIntakeResponse({ state, next_question: null, red_flag: redFlag });
      enqueuePatient(entry, state, redFlag);
      selectPatient(sessionId);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
          <Sparkles className="w-3.5 h-3.5" /> Jury Demonstration Mode
        </span>

        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="case_a">🚨 Case A: Acute Coronary Syndrome (High Urgency Red-Flag)</option>
          <option value="case_b">📋 Case B: Chronic Diabetes Follow-up & Neuropathy (Routine)</option>
        </select>
      </div>

      <button
        onClick={handleLoadScenario}
        className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
      >
        <Play className="w-3.5 h-3.5 fill-white" />
        <span>Inject Live Scenario</span>
      </button>
    </div>
  );
}
