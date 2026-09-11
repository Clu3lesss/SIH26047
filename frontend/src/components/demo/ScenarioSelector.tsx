'use client';

import { useState } from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { useDoctorStore } from '@/store/doctorStore';
import type { PatientHistoryState, RedFlagResult } from '@/types/intake';
import type { QueueEntry } from '@/types/kiosk';
import { createPatientAndSession, saveCompletedHistory, saveRedFlagAlert } from '@/lib/actions/db';
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
        queuePosition: 42,
        tokenStatus: 'confirmed',
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

      const sampleDocs = [
        {
          id: 'demo-doc-1',
          fileUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
          documentType: 'ECG Report',
          fileName: '12_Lead_Emergency_ECG.jpg',
          createdAt: new Date().toISOString(),
        },
      ];

      initSession(patient);
      useKioskStore.getState().setTokenNumber(42);
      useKioskStore.getState().setTokenStatus('confirmed');
      addAIMessage("What brings you in today?");
      addPatientMessage(state.chief_complaint!);
      addAIMessage("Does the pain spread anywhere else?");
      addPatientMessage("Yes, radiating down left arm and into jaw with cold sweat.");
      setIntakeResponse({ state, next_question: null, red_flag: redFlag });
      enqueuePatient(entry, state, redFlag, sampleDocs);
      selectPatient(sessionId);

      // Also persist to DB in background so it never disappears on refresh or sync
      createPatientAndSession(patient, sessionId, entry.tokenNumber)
        .then(() => saveCompletedHistory(sessionId, state))
        .then(() => saveRedFlagAlert(sessionId, redFlag))
        .catch(() => {});
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
        queuePosition: 43,
        tokenStatus: 'confirmed',
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

      const sampleDocsB = [
        {
          id: 'demo-doc-2',
          fileUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
          documentType: 'Lab Report',
          fileName: 'Quarterly_HbA1c_Blood_Test.jpg',
          createdAt: new Date().toISOString(),
        },
      ];

      initSession(patient);
      useKioskStore.getState().setTokenNumber(43);
      useKioskStore.getState().setTokenStatus('confirmed');
      addAIMessage("What brings you in today?");
      addPatientMessage(state.chief_complaint!);
      setIntakeResponse({ state, next_question: null, red_flag: redFlag });
      enqueuePatient(entry, state, redFlag, sampleDocsB);
      selectPatient(sessionId);

      // Also persist to DB in background so it never disappears on refresh or sync
      createPatientAndSession(patient, sessionId, entry.tokenNumber)
        .then(() => saveCompletedHistory(sessionId, state))
        .catch(() => {});
    } else if (selectedScenario === 'case_c') {
      // Case C: AIIA Ayurvedic OPD (Amlapitta & Agnimandya)
      const sessionId = 'DEMO-AYUSH-1088';
      const patient = {
        name: 'Vaidya Ananya Joshi',
        age: '44',
        sex: 'female' as const,
        mobile: '+91 9823456789',
        abhaId: '22-9182-4410',
        language: 'en' as const,
        department: 'ayush' as const,
      };

      const state: PatientHistoryState = {
        session_id: sessionId,
        turn_count: 6,
        status: 'completed',
        department: 'ayush',
        chief_complaint: 'Amlapitta (Hyperacidity, retrosternal sour belching, epigastric Vidaha/burning) with Mandagni',
        hpi: {
          site: 'Amashaya / Epigastrium and Uras (Chest)',
          onset: 'Gradual onset over 3 months, severe post-Vidahi ahara',
          character: 'Daha (intense burning sensation) accompanied by sour/acid eructations (Amla Udgara)',
          radiation: 'Ascending upwards towards throat and retrosternal area',
          associated_symptoms: ['Aruchi (Anorexia)', 'Klama (Fatigue without exertion)', 'Utklesha (Nausea)'],
          timing: 'Post-prandial (2-3 hours after meals), nocturnal aggravation',
          exacerbating_factors: ['Katu-Amla-Lavana rasa (Spicy, sour foods)', 'Ratri-Jagarana (Late night work)', 'Chinta (Mental stress)'],
          relieving_factors: ['Sheetopachara (Cold milk intake)', 'Langhana (Fasting/light diet)'],
          severity: 'Moderate to high distress (6/10)',
        },
        dashavidha: {
          prakriti: 'Pitta-Vataja (पित्त-वात)',
          vikriti: 'Pitta Pradhana Samana-Apana Vata Dusti',
          sara: 'Madhyama Rakta & Mamsa Sara',
          samhanana: 'Madhyama (Medium body build & muscular density)',
          pramana: 'Madhyama (Anatomically proportional)',
          satmya: 'Katu-Ushna Satmya (accustomed to spicy, now intolerant)',
          sattva: 'Madhyama (Moderate psychological resilience)',
          ahara_shakti: 'Mandagni / Vishamagni (Impaired digestive capacity)',
          vyayama_shakti: 'Avara (Low physical stamina / easy fatigability)',
          vaya: 'Madhyama Vaya (44 yrs, Pitta-dominant lifecycle phase)',
          ahara_vihara: {
            dietary_habits: 'Irregular meal timings, frequent tea/coffee, spicy fried snacks',
            lifestyle_routine: 'Sedentary desk work, Ratri Jagarana (sleeps at 1 AM), Divasvapna (afternoon naps)',
            koshtha: 'Krura Koshtha (Hard bowel movements / mild constipation)',
          },
        },
        conditions: ['Dyspepsia (Functional)', 'Chronic GERD'],
        conditions_asked: true,
        surgeries: [],
        surgeries_asked: true,
        medications: ['Avipattikar Churna 3g BD', 'Kamadudha Rasa 250mg OD'],
        medications_asked: true,
        allergies: ['None reported'],
        allergies_asked: true,
        family_history: [
          { relation: 'Mother', condition: 'Amlapitta and Grahani Roga' },
        ],
        family_history_asked: true,
        social_history: {
          diet: 'Vegetarian with excessive pungent & oily preparations',
          smoking: 'Non-smoker',
          alcohol: 'Non-drinker',
          occupation: 'High school teacher',
          living_situation: 'Lives with family in Delhi',
        },
        social_history_asked: true,
        review_of_systems: {
          cardiovascular: 'No palpitations, normal pulse (Pitta-Vata Nadi)',
          respiratory: 'Clear, no cough',
          gastrointestinal: 'Retrosternal burning, sour eructations, flatulence',
          neurological: 'Disturbed sleep due to acid reflux',
          musculoskeletal: 'Mild generalized lethargy (Gaurava)',
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
        tokenNumber: 44,
        queuePosition: 44,
        tokenStatus: 'confirmed',
        patientName: patient.name,
        age: patient.age,
        sex: patient.sex,
        arrivedAt: Date.now() - 2 * 60 * 1000,
        isRedFlag: false,
        urgencyTier: null,
        redFlagReason: null,
        isCompleted: true,
        summaryLoaded: false,
        department: 'ayush',
      };

      const sampleDocsC = [
        {
          id: 'demo-doc-ayush-1',
          fileUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
          documentType: 'Ayurvedic Prescription',
          fileName: 'AIIA_OPD_Prescription_Case.jpg',
          createdAt: new Date().toISOString(),
        },
      ];

      initSession(patient);
      useKioskStore.getState().setTokenNumber(44);
      useKioskStore.getState().setTokenStatus('confirmed');
      addAIMessage("Namaste! Welcome to AIIA Ayurvedic OPD. What symptoms are troubling you today?");
      addPatientMessage(state.chief_complaint!);
      addAIMessage("How is your appetite (Agni) and daily bowel pattern (Koshtha)?");
      addPatientMessage("Appetite is very low (Mandagni), with burning in chest after eating and Krura Koshtha.");
      setIntakeResponse({ state, next_question: null, red_flag: redFlag });
      enqueuePatient(entry, state, redFlag, sampleDocsC);
      selectPatient(sessionId);

      // Persist to DB in background
      createPatientAndSession(patient, sessionId, entry.tokenNumber)
        .then(() => saveCompletedHistory(sessionId, state))
        .catch(() => {});
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs z-20">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          Test Scenario
        </span>

        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
        >
          <option value="case_a">Case A: Acute Coronary Syndrome (STEMI · High Urgency Red-Flag)</option>
          <option value="case_b">Case B: Chronic Diabetes Follow-up & Neuropathy (Routine)</option>
          <option value="case_c">Case C: AIIA Ayurvedic OPD · Amlapitta (Dashavidha Pariksha)</option>
        </select>
      </div>

      <button
        onClick={handleLoadScenario}
        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs px-4 py-2 rounded-md shadow-2xs transition-all active:scale-98 cursor-pointer"
      >
        <Play className="w-3.5 h-3.5 fill-white" />
        <span>Inject Live Scenario</span>
      </button>
    </div>
  );
}
