import Link from 'next/link';
import {
  Stethoscope,
  Monitor,
  Users,
  ArrowRight,
  CheckCircle2,
  Brain,
  ScanLine,
  ClipboardList,
} from 'lucide-react';

const STATS = [
  { value: '2-5 min', label: 'Average OPD consultation time in India', highlight: true },
  { value: '70-80%', label: 'Diagnoses possible from history alone', highlight: false },
  { value: '10,000+', label: 'Daily OPD patients at apex hospitals', highlight: false },
  { value: '6 turns', label: 'MediKiosk captures full history in', highlight: false },
];

const FLOW_STEPS = [
  { num: '1', icon: Monitor, title: 'Identify', desc: 'Patient registers, selects language, grants consent', color: 'bg-teal-500' },
  { num: '2', icon: Brain, title: 'Converse', desc: 'AI conducts adaptive voice + touch history interview', color: 'bg-violet-500' },
  { num: '3', icon: ScanLine, title: 'Scan', desc: 'Patient uploads prescriptions and lab reports', color: 'bg-blue-500' },
  { num: '4', icon: ClipboardList, title: 'Summarize', desc: 'AI generates structured physician-ready summary', color: 'bg-orange-500' },
  { num: '5', icon: Stethoscope, title: 'Consult', desc: 'Doctor reviews complete history in seconds', color: 'bg-slate-600' },
];

const PORTALS = [
  {
    href: '/kiosk', icon: Monitor, title: 'Patient Kiosk', subtitle: 'Waiting area tablet',
    description: 'The patient-facing interface. AI asks up to 6 adaptive clinical questions via voice or touch and captures a complete 7-section medical history.',
    accentBg: 'bg-teal-600', iconBg: 'bg-teal-50', iconColor: 'text-teal-600',
    badge: 'Patient Facing', badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200',
    ctaClass: 'text-teal-600', features: ['Voice + touch input', 'Red-flag detection', 'Document upload'], cta: 'Open Kiosk',
  },
  {
    href: '/doctor', icon: Stethoscope, title: 'Physician Dashboard', subtitle: 'Consultation room screen',
    description: 'Live physician view - patient queue sorted by urgency, structured history, AI-generated summary, uploaded documents, red-flag alerts.',
    accentBg: 'bg-slate-700', iconBg: 'bg-slate-100', iconColor: 'text-slate-600',
    badge: 'Clinical Staff', badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    ctaClass: 'text-slate-700', features: ['Live 4-second sync', 'Red-flag priority queue', 'Editable AI summary'], cta: 'Open Dashboard',
  },
  {
    href: '/demo', icon: Users, title: 'Live Demo Mode', subtitle: 'Side-by-side split screen',
    description: 'Both screens side by side - watch the patient intake on the left instantly feed the physician dashboard on the right in real time.',
    accentBg: 'bg-violet-600', iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
    badge: 'Recommended - Start Here', badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
    ctaClass: 'text-violet-600', features: ['Pre-loaded scenarios', 'Real-time sync', 'Full flow in one view'], cta: 'Launch Demo',
  },
];

const TECH = ['Next.js 14', 'FastAPI', 'Mistral AI', 'Supabase', 'Prisma ORM', 'LangChain'];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-none">MediKiosk</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">AI Clinical History Intake</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
              OPD Triage System
            </span>
            <Link href="/demo" className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
              Start Demo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-800 border border-teal-200 px-3.5 py-1 rounded-full text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
          Autonomous Clinical Intake & Triage Platform
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 leading-[1.15] tracking-tight max-w-4xl mx-auto">
          Complete clinical history — <br className="hidden sm:inline" />
          <span className="text-teal-600">before the doctor walks in.</span>
        </h2>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
          Indian OPDs average <strong className="text-slate-900 font-semibold">2–5 minutes</strong> per consultation.
          MediKiosk captures a structured 7-section clinical history via adaptive AI conversation and document
          digitization in the waiting room — returning clinical time to examination and diagnosis.
        </p>
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
          <Link
            href="/demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-all shadow-xs"
          >
            <Users className="w-4 h-4" />
            Launch Live Demo
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Link>
          <Link
            href="/kiosk"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-teal-500 hover:bg-teal-50/30 text-slate-700 font-semibold px-6 py-3 rounded-lg text-sm transition-all"
          >
            <Monitor className="w-4 h-4 text-slate-500" />
            Try Patient Kiosk
          </Link>
          <Link
            href="/doctor"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-lg text-sm transition-all"
          >
            <Stethoscope className="w-4 h-4 text-slate-500" />
            Doctor Dashboard
          </Link>
        </div>
      </section>

      {/* Connected Stats Ribbon */}
      <section className="max-w-6xl mx-auto px-6 pb-14 w-full">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden">
          {STATS.map((s) => (
            <div key={s.value} className={`p-5 text-center ${s.highlight ? 'bg-red-50/40' : ''}`}>
              <p className={`text-2xl lg:text-3xl font-black mb-1 tracking-tight ${s.highlight ? 'text-red-600' : 'text-slate-900'}`}>
                {s.value}
              </p>
              <p className="text-xs text-slate-500 leading-snug font-medium max-w-[180px] mx-auto">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5-Step Clinical Stepper Journey */}
      <section className="bg-white border-y border-slate-200 py-14 px-6 mb-14">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-widest mb-1.5">Standardized OPD Workflow</p>
            <h3 className="text-2xl font-extrabold text-slate-900">End-to-End Patient Triage Journey</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative flex flex-col items-center text-center p-4 rounded-lg bg-slate-50/80 border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-teal-700 font-bold mb-3 shadow-2xs">
                    <Icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Step 0{step.num}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Access Points</p>
          <h3 className="text-2xl font-extrabold text-slate-900">Explore MediKiosk Environments</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PORTALS.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link
                key={portal.href}
                href={portal.href}
                className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative"
              >
                <div className={`h-1 w-full ${portal.accentBg}`} />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${portal.iconBg} ${portal.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${portal.badgeClass}`}>
                      {portal.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-0.5 group-hover:text-teal-700 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mb-3">{portal.subtitle}</p>
                  <p className="text-xs text-slate-600 flex-1 leading-relaxed">{portal.description}</p>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Key Highlights</p>
                    <ul className="space-y-1.5 mb-5">
                      {portal.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`mt-auto flex items-center justify-between font-bold text-xs pt-3 border-t border-slate-100 ${portal.ctaClass}`}>
                    <span>{portal.cta}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-teal-700 text-white py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-300 mb-3">Core Clinical Engine Architecture</p>
            <div className="flex flex-wrap gap-2">
              {['Module A · Conversational History Intake', 'Module B · Document Digitization & OCR', 'Module C · Synthesized Clinical Notes', 'Automated Red-Flag Detection'].map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 bg-teal-600 text-teal-100 text-xs font-medium px-3 py-1 rounded border border-teal-500">
                  <CheckCircle2 className="w-3 h-3 text-teal-300" />
                  {m}
                </span>
              ))}
            </div>
          </div>
          <Link href="/demo" className="bg-white text-teal-700 font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-teal-50 transition-colors shrink-0 flex items-center gap-2">
            <Users className="w-4 h-4" /> Open Full Demo
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white">MediKiosk</span>
            <span className="text-slate-600">·</span>
            <span>Intelligent Hospital OPD Intake</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {TECH.map((t) => (
              <span key={t} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono">{t}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
