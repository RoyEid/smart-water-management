import { ArrowLeft, Droplets } from "lucide-react";
import { Link } from "react-router-dom";

function RecoveryLayout({ children }) {
  return (
    <main className="relative flex min-h-screen justify-center overflow-y-auto bg-linear-to-br from-blue-950 via-blue-800 to-cyan-600 px-5 py-10">
      {/* Background effects */}
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-blue-300/15 blur-3xl" />

      <div className="water-bubble absolute left-[12%] top-[20%] h-6 w-6 rounded-full border border-white/20 bg-white/10" />

      <div className="water-bubble water-bubble-delay absolute bottom-[18%] right-[14%] h-9 w-9 rounded-full border border-cyan-200/20 bg-cyan-200/10" />

      {/* Logo */}
      <Link
        to="/login"
        className="absolute left-5 top-5 z-10 flex items-center gap-3 text-white sm:left-10 sm:top-8"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-lg">
          <Droplets size={24} />
        </span>

        <span>
          <strong className="block text-sm">Smart Water</strong>

          <small className="text-xs text-blue-100">Management System</small>
        </span>
      </Link>

      {/* Recovery card */}
      <section className="relative z-10 my-auto w-full max-w-lg rounded-3xl border border-white/30 bg-white p-6 shadow-2xl shadow-blue-950/25 sm:p-9">
        <Link
          to="/login"
          className="mb-7 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <ArrowLeft size={17} />
          Back to login
        </Link>

        {children}
      </section>

      <p className="absolute bottom-5 text-center text-xs text-blue-100/70">
        Secure authentication · Smart Water Management
      </p>
    </main>
  );
}

export default RecoveryLayout;
