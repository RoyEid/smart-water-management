import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import RecoveryLayout from "../components/RecoveryLayout";
import api from "../services/api";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateEmail() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    setError("");
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError("");

    if (!validateEmail()) {
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/forgot-password",
        {
          email: email.trim(),
        },
      );

      navigate("/verify-code", {
        state: {
          email: email.trim(),
          purpose: "reset-password",
          message: response.data.message,
        },
      });
    } catch (requestError) {
      setServerError(
        requestError.response?.data?.message ||
          "Unable to connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <RecoveryLayout>
      {/* Icon */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
        <KeyRound size={27} />
      </div>

      {/* Heading */}
      <div>
        <p className="mb-2 text-sm font-semibold text-blue-700">
          Password recovery
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Forgot your password?
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter your registered email address. We will send you a
          six-digit verification code.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>{serverError}</p>
        </div>
      )}

      {/* Form */}
      <form
        className="mt-7"
        onSubmit={handleSubmit}
        noValidate
      >
        <label
          htmlFor="recovery-email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Email address
        </label>

        <div className="relative">
          <Mail
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="recovery-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
              setServerError("");
            }}
            placeholder="name@example.com"
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? "recovery-email-error" : undefined
            }
            className={`h-13 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
            }`}
          />
        </div>

        {error && (
          <p
            id="recovery-email-error"
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-500"
          >
            <AlertCircle size={13} />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <LoaderCircle
                size={19}
                className="animate-spin"
              />
              Sending code...
            </>
          ) : (
            <>
              Send verification code
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Security note */}
      <div className="mt-7 flex items-start gap-3 rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-emerald-600"
        />

        <p>
          For your security, the verification code will expire after
          10 minutes and can only be used once.
        </p>
      </div>
    </RecoveryLayout>
  );
}

export default ForgotPasswordPage;