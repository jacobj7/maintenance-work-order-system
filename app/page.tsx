import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">
            MaintenanceIQ
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-slate-300 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/10"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/25"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            <span className="text-blue-300 text-sm font-medium">
              AI-Powered Maintenance Management
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            Smarter Maintenance,
            <br />
            Zero Downtime
          </h1>

          <p className="text-xl text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
            MaintenanceIQ is an intelligent maintenance management platform that
            helps facilities teams track work orders, schedule preventive
            maintenance, and resolve issues faster with AI-assisted diagnostics.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-400/40 hover:-translate-y-0.5 text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-28">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/8 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Work Order Management</h3>
            <p className="text-slate-400 leading-relaxed">
              Create, assign, and track maintenance work orders from submission
              to completion. Prioritize tasks and keep your team aligned in
              real-time.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/8 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Preventive Scheduling</h3>
            <p className="text-slate-400 leading-relaxed">
              Automate recurring maintenance schedules for all your assets.
              Reduce unexpected failures and extend equipment lifespan with
              proactive care.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/8 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">AI Diagnostics</h3>
            <p className="text-slate-400 leading-relaxed">
              Leverage Claude AI to diagnose equipment issues, suggest repair
              procedures, and generate detailed maintenance reports
              automatically.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-16">
          {[
            { value: "40%", label: "Reduction in downtime" },
            { value: "3x", label: "Faster issue resolution" },
            { value: "99.9%", label: "Platform uptime" },
            { value: "500+", label: "Facilities managed" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-extrabold text-blue-400 mb-2">
                {stat.value}
              </div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span className="font-semibold text-slate-400">MaintenanceIQ</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link
              href="/login"
              className="hover:text-slate-300 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="hover:text-slate-300 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
