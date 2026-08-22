import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";
import OAuthButtons from "../components/OAuthButtons";
import { useAuth } from "../context/AuthContext";

/**
 * Maps the ?oauthError= code the backend redirects with onto a message.
 *
 * Lives outside the component so it can seed useState lazily on the first
 * render, before any effect runs.
 */
function readOAuthErrorStatus() {
  const oauthError = new URLSearchParams(window.location.search).get("oauthError");
  if (!oauthError) return null;

  const errorMessages = {
    google: "Google authentication failed. Please try again.",
    github:
      "GitHub authentication failed. Make sure your GitHub account has a verified email address.",
    no_email:
      "No verified email address was provided by your OAuth provider. Please verify your email with the provider or register locally.",
    account_link_failed:
      "Unable to link account. An account with this email already exists under a different authentication method.",
    account_disabled:
      "This account has been disabled. Please contact an administrator.",
  };

  return {
    type: "error",
    message: errorMessages[oauthError] || "Authentication failed. Please try again.",
  };
}

function LoginPage() {
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  // An ?oauthError= parameter is part of the URL this page was opened with, so
  // the banner is initial state derived during the first render rather than
  // written back by an effect afterwards.
  const [status, setStatus] = useState(readOAuthErrorStatus);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Explicitly ensure form credentials start empty on component mount
    setFormData({
      email: "",
      password: "",
      rememberMe: false,
    });

    // Strips the parameter from the address bar so a refresh does not re-show
    // an error about an attempt the user has already seen. Touching history is
    // an external side effect, which is exactly what an effect is for.
    if (new URLSearchParams(window.location.search).has("oauthError")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });

    setStatus(null);
  }

  function checkCapsLock(event) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  function validateForm() {
    const newErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const newErrors = validateForm();
    setErrors(newErrors);
    setStatus(null);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Unable to connect to the server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }
  // The OAuth redirect URLs are built by utils/oauth.js and used by the
  // OAuthButtons component below. The two local copies that used to live here
  // were unreferenced duplicates of that helper.

  return (
    <div>
      {/* Heading */}
      <div>
        <p className="mb-2 text-sm font-semibold text-blue-700">Welcome back</p>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Log in to your account
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter your account details to access the smart water system.
        </p>
      </div>

      {/* Status message */}
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

      {/* Login form */}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} autoComplete="off" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
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
              id="login-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className={`h-13 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                errors.email
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
              }`}
            />
          </div>

          {errors.email && (
            <p
              id="login-email-error"
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-500"
            >
              <AlertCircle size={13} />
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
            />

            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              onKeyUp={checkCapsLock}
              onBlur={() => setCapsLock(false)}
              placeholder="Enter your password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              className={`h-13 w-full rounded-xl border bg-white pl-12 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                errors.password
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {errors.password && (
            <p
              id="login-password-error"
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-500"
            >
              <AlertCircle size={13} />
              {errors.password}
            </p>
          )}

          {capsLock && (
            <p className="mt-2 text-xs font-medium text-amber-600">
              Caps Lock is currently enabled.
            </p>
          )}
        </div>

        {/* Remember and forgot password */}
        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
            <input
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="custom-checkbox"
            />
            Remember me
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-blue-700 transition hover:text-blue-900 focus:outline-none focus:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <LoaderCircle size={19} className="animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              Log in
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* OAuth login */}
      <OAuthButtons />
      {/* Register switch */}
      <p className="mt-5 text-center text-sm text-slate-500">
        {" "}
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-bold text-blue-700 transition hover:text-blue-900 focus:outline-none focus:underline"
        >
          Create account
        </Link>
      </p>

      {/* Security */}
      <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400">
        {" "}
        <ShieldCheck size={15} className="text-emerald-600" />
        JWT will be stored in a secure HTTP-only cookie.
      </div>
    </div>
  );
}

export default LoginPage;
