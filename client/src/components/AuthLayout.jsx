import { Link } from "react-router-dom";
import { Activity, Droplets, Gauge, ShieldCheck } from "lucide-react";

function AuthLayout({ isRegister, loginForm, registerForm }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop */}
      <div className="relative hidden h-dvh grid-cols-2 overflow-hidden lg:grid">
        {/* Login form */}
        <section
          aria-hidden={isRegister}
          className={`flex h-dvh justify-center overflow-y-auto px-8 py-4 transition-all duration-500 xl:px-12 ${
            isRegister
              ? "pointer-events-none -translate-x-8 opacity-0"
              : "translate-x-0 opacity-100 delay-300"
          }`}
        >
          <div className="my-auto w-full max-w-md auth-form-wrapper">{loginForm}</div>
        </section>

        {/* Registration form */}
        <section
          aria-hidden={!isRegister}
          className={`flex h-dvh justify-center overflow-y-auto px-8 py-4 transition-all duration-500 xl:px-12 ${
            isRegister
              ? "translate-x-0 opacity-100 delay-300"
              : "pointer-events-none translate-x-8 opacity-0"
          }`}
        >
          <div className="my-auto w-full max-w-md py-2 auth-form-wrapper">{registerForm}</div>
        </section>

        {/* Sliding information panel */}
        <div
          className={`absolute inset-y-0 left-0 z-20 w-1/2 transform-gpu transition-transform duration-700 ease-in-out ${
            isRegister ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <InformationPanel isRegister={isRegister} />
        </div>
      </div>

      {/* Mobile and tablet */}
      <section className="min-h-screen px-5 py-7 sm:px-8 lg:hidden">
        <div className="mx-auto w-full max-w-md">
          <MobileLogo />

          {/* Mobile switch */}
          <div className="mb-8 grid grid-cols-2 rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1">
            <Link
              to="/login"
              className={`rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                !isRegister
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-cyan-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Log in
            </Link>

            <Link
              to="/register"
              className={`rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                isRegister
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-cyan-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Register
            </Link>
          </div>

          <div
            key={isRegister ? "register" : "login"}
            className="auth-form-enter"
          >
            {isRegister ? registerForm : loginForm}
          </div>
        </div>
      </section>
    </main>
  );
}

function InformationPanel({ isRegister }) {
  return (
    <section className="info-panel relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-linear-to-br from-blue-950 via-blue-800 to-cyan-600 px-10 py-6 text-white xl:px-12 xl:py-7">
      {/* Decorative bubbles */}
      <div className="water-bubble absolute right-[10%] top-[12%] h-7 w-7 rounded-full border border-white/20 bg-white/10" />

      <div className="water-bubble water-bubble-delay absolute right-[20%] top-[24%] h-4 w-4 rounded-full border border-cyan-200/30 bg-cyan-200/10" />

      <div className="water-bubble absolute bottom-[18%] left-[12%] h-5 w-5 rounded-full border border-white/20 bg-white/10" />

      {/* Background glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

      {/* Logo */}
      <div className="relative flex shrink-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-lg xl:h-12 xl:w-12 xl:rounded-2xl">
          <Droplets size={26} />
        </div>

        <div>
          <h1 className="text-lg font-bold">Smart Water</h1>

          <p className="text-xs text-blue-100">Management System</p>
        </div>
      </div>

      {/* Main information */}
      <div className="relative my-auto max-w-xl py-4">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-cyan-100 backdrop-blur-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
          Intelligent water management
        </p>

        <h2 className="text-4xl font-bold leading-tight xl:text-5xl">
          Control every drop.
          <span className="block text-cyan-300">Protect every moment.</span>
        </h2>

        <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100 xl:text-base">
          Monitor water levels, control the pump, and manage your system safely
          from one intelligent platform.
        </p>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Feature icon={<Activity size={20} />} text="Live monitoring" />

          <Feature icon={<Gauge size={20} />} text="Pump control" />

          <Feature icon={<ShieldCheck size={20} />} text="Secure access" />
        </div>

        {/* Login/Register switch */}
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
          <div>
            <p className="text-sm font-bold">
              {isRegister ? "Already registered?" : "New to Smart Water?"}
            </p>

            <p className="mt-1 text-xs text-blue-100">
              {isRegister
                ? "Access your existing account."
                : "Create your secure account."}
            </p>
          </div>

          <Link
            to={isRegister ? "/login" : "/register"}
            className="shrink-0 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-blue-800 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            {isRegister ? "Log in" : "Register"}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="relative shrink-0 text-xs text-blue-200">
        Smart Water Management System
      </p>

      {/* Water waves */}
      <div className="pointer-events-none absolute -bottom-20 -left-[10%] h-40 w-[120%] rounded-[50%] bg-cyan-400/10" />

      <div className="pointer-events-none absolute -bottom-28 -left-[5%] h-44 w-[110%] rounded-[50%] bg-blue-300/10" />
    </section>
  );
}

function MobileLogo() {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/20">
        <Droplets size={24} />
      </div>

      <div>
        <p className="font-bold text-slate-900 dark:text-slate-100">Smart Water</p>

        <p className="text-xs text-slate-500 dark:text-slate-400">Management System</p>
      </div>
    </div>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15 xl:p-4">
      <span className="text-cyan-300">{icon}</span>

      <p className="mt-2 text-xs font-medium xl:mt-3 xl:text-sm">{text}</p>
    </div>
  );
}

export default AuthLayout;
