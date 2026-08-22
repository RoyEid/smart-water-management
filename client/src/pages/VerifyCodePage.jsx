import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import OtpInput from "../components/OtpInput";
import RecoveryLayout from "../components/RecoveryLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const CODE_LENGTH = 6;
const RESEND_WAIT = 60;
const CODE_EXPIRY = 10 * 60;

function VerifyCodePage() {
  const { refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const emailParam = queryParams.get("email") || "";
  const codeParam = queryParams.get("code") || "";
  const purposeParam = queryParams.get("purpose") || "";

  const email =
    emailParam ||
    location.state?.email ||
    sessionStorage.getItem("verificationEmail") ||
    "";

  const purpose =
    purposeParam ||
    location.state?.purpose ||
    sessionStorage.getItem("verificationPurpose") ||
    "verify-email";

  // Seeded from the ?code= parameter during the initial render rather than
  // written back by an effect: the parameter is part of the URL the page was
  // opened with, so it is initial state, not a later synchronisation.
  const [code, setCode] = useState(() =>
    codeParam && codeParam.length === CODE_LENGTH
      ? codeParam.split("")
      : Array(CODE_LENGTH).fill("")
  );

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_WAIT);
  const [expiryTimer, setExpiryTimer] = useState(CODE_EXPIRY);

  useEffect(() => {
    if (email) {
      sessionStorage.setItem("verificationEmail", email);

      sessionStorage.setItem("verificationPurpose", purpose);
    }
  }, [email, purpose]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((current) => Math.max(current - 1, 0));

      setExpiryTimer((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(null);

    const completeCode = code.join("");

    if (completeCode.length !== CODE_LENGTH) {
      setStatus({
        type: "error",
        message: "Please enter all six digits.",
      });

      return;
    }

    if (expiryTimer === 0) {
      setStatus({
        type: "error",
        message: "This verification code has expired. Request a new code.",
      });

      return;
    }

    try {
      setLoading(true);

      const endpoint =
        purpose === "reset-password"
          ? "/auth/verify-reset-code"
          : "/auth/verify-email";

      const response = await api.post(endpoint, {
        email,
        code: completeCode,
      });

      sessionStorage.removeItem("verificationEmail");
      sessionStorage.removeItem("verificationPurpose");

      if (purpose === "reset-password") {
        navigate("/reset-password", {
          replace: true,
          state: {
            email,
            resetToken: response.data.resetToken,
          },
        });
      } else {
        await refreshUser();
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "The verification code is incorrect.",
      });

      setCode(Array(CODE_LENGTH).fill(""));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0 || resending || !email) {
      return;
    }

    setStatus(null);

    try {
      setResending(true);

      const endpoint =
        purpose === "reset-password"
          ? "/auth/forgot-password"
          : "/auth/resend-verification";

      const response = await api.post(endpoint, {
        email,
      });

      setCode(Array(CODE_LENGTH).fill(""));
      setResendTimer(RESEND_WAIT);
      setExpiryTimer(CODE_EXPIRY);

      setStatus({
        type: "success",
        message: response.data.message || "A new verification code was sent.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Unable to resend the code.",
      });
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <RecoveryLayout>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertCircle size={27} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Verification unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            No email address was provided. Return to Login and restart the
            process.
          </p>
        </div>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout>
      {/* Icon */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
        <MailCheck size={27} />
      </div>

      {/* Heading */}
      <div>
        <p className="mb-2 text-sm font-semibold text-blue-700">
          Security verification
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Enter the six-digit code
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          We sent a verification code to{" "}
          <strong className="text-slate-700">{maskEmail(email)}</strong>.
        </p>
      </div>

      {/* Status */}
      {status && (
        <div
          aria-live="polite"
          className={`mt-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
          )}

          <p>{status.message}</p>
        </div>
      )}

      {/* Code form */}
      <form className="mt-7" onSubmit={handleSubmit}>
        <OtpInput
          value={code}
          onChange={(updatedCode) => {
            setCode(updatedCode);
            setStatus(null);
          }}
          disabled={loading || expiryTimer === 0}
        />

        {/* Expiration */}
        <div
          className={`mt-4 flex items-center justify-center gap-2 text-xs font-medium ${
            expiryTimer === 0 ? "text-red-600" : "text-slate-500"
          }`}
        >
          <Clock3 size={15} />

          {expiryTimer === 0
            ? "Code expired"
            : `Code expires in ${formatTime(expiryTimer)}`}
        </div>

        {/* Verify button */}
        <button
          type="submit"
          disabled={loading || expiryTimer === 0}
          className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <LoaderCircle size={19} className="animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              Verify code
            </>
          )}
        </button>
      </form>

      {/* Resend */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">Didn&apos;t receive the code?</p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendTimer > 0 || resending}
          className="mt-2 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-blue-700 transition hover:text-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {resending ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}

          {resendTimer > 0
            ? `Resend in ${resendTimer}s`
            : "Resend verification code"}
        </button>
      </div>
    </RecoveryLayout>
  );
}

function maskEmail(email) {
  const [username, domain] = email.split("@");

  if (!username || !domain) {
    return email;
  }

  const visibleCharacter = username.charAt(0);
  const hiddenCharacters = "*".repeat(
    Math.min(Math.max(username.length - 1, 3), 6),
  );

  return `${visibleCharacter}${hiddenCharacters}@${domain}`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default VerifyCodePage;
