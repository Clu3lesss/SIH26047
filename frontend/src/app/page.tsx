import Link from 'next/link';
import { Stethoscope, Monitor, Users, ArrowRight } from 'lucide-react';

const portals = [
  {
    href: '/kiosk',
    icon: Monitor,
    title: 'Patient Kiosk',
    subtitle: 'For patients in the OPD waiting area',
    description:
      'Capture your complete clinical history through voice and touch before your consultation.',
    color: 'from-teal-500 to-teal-700',
    badge: 'Patient Facing',
    badgeColor: 'bg-teal-100 text-teal-800',
  },
  {
    href: '/doctor',
    icon: Stethoscope,
    title: 'Physician Dashboard',
    subtitle: 'For doctors and clinical staff',
    description:
      'View structured patient histories, red-flag alerts, and AI-generated summaries before consultation.',
    color: 'from-slate-600 to-slate-900',
    badge: 'Clinical Staff',
    badgeColor: 'bg-slate-100 text-slate-700',
  },
  {
    href: '/demo',
    icon: Users,
    title: 'Live Demo Mode',
    subtitle: 'For SIH jury evaluation',
    description:
      'Side-by-side split view showing real-time kiosk intake feeding the physician dashboard live.',
    color: 'from-violet-500 to-violet-800',
    badge: 'Demo',
    badgeColor: 'bg-violet-100 text-violet-800',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-clinical-offwhite flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-clinical-muted px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">MediKiosk</h1>
            <p className="text-xs text-slate-500">AI Clinical History Intake · SIH Problem Statement 47</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-teal-200">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          Smart India Hackathon 2026 · PS-47
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
          Clinical history intake,<br />
          <span className="text-teal-600">before the consultation.</span>
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Indian OPDs see 2–12 minutes per patient. MediKiosk captures a complete,
          structured 7-section clinical history via voice and touch — so doctors
          can focus entirely on examination and diagnosis.
        </p>
      </section>

      {/* Portal Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
        {portals.map((portal) => {
          const Icon = portal.icon;
          return (
            <Link
              key={portal.href}
              href={portal.href}
              className="group bg-white rounded-2xl border border-clinical-muted shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
            >
              <div className={`bg-gradient-to-br ${portal.color} p-8 flex items-center justify-center`}>
                <Icon className="w-14 h-14 text-white" />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit mb-3 ${portal.badgeColor}`}>
                  {portal.badge}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{portal.title}</h3>
                <p className="text-sm text-slate-500 mb-3">{portal.subtitle}</p>
                <p className="text-sm text-slate-600 flex-1">{portal.description}</p>
                <div className="mt-4 flex items-center gap-2 text-teal-600 font-semibold text-sm group-hover:gap-3 transition-all">
                  Open Portal <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Architecture note */}
      <footer className="border-t border-clinical-muted bg-white py-6 px-6 text-center text-sm text-slate-500">
        Backend: FastAPI microservice at <code className="bg-slate-100 px-1 rounded">:8000</code> ·
        Pipeline 1: <code className="bg-slate-100 px-1 rounded">POST /intake</code> ·
        Pipeline 2: <code className="bg-slate-100 px-1 rounded">POST /summary</code>
      </footer>
    </main>
  );
}
