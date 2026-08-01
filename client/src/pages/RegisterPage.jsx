import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import api from "../services/api";
import OAuthButtons from "../components/OAuthButtons";

function RegisterPage() {
  const navigate = useNavigate();

  // Switching between /login and /register remounts this component (AuthPage
  // keys both forms on the pathname), which clears the password fields as a
  // natural consequence of the remount. The effect that used to reset them
  // here ran before its own state was declared and is no longer needed.
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRules = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  };

  const passwordScore = Object.values(passwordRules).filter(Boolean).length;

  const strengthDetails = getPasswordStrength(passwordScore);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });

    setStatus(null);
  }

  function validateForm() {
    const newErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (formData.name.trim().length < 2) {
      newErrors.name = "Please enter your full name.";
    }

    if (!emailPattern.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!Object.values(passwordRules).every(Boolean)) {
      newErrors.password = "Your password does not meet all requirements.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "The passwords do not match.";
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

      const response = await api.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate("/verify-code", {
        state: {
          email: formData.email.trim(),
          purpose: "verify-email",
          message: response.data.message,
        },
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Unable to connect to the server. Please try again.",
      });

      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Heading */}
      <div>
        <p className="mb-2 text-sm font-semibold text-blue-700">
          Create an account
        </p>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Get started securely
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Create your account to access the smart water system.
        </p>
      </div>

      {/* Error message */}
      {status && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />

          <p>{status.message}</p>
        </div>
      )}

      {/* Form */}
      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField
          id="register-name"
          name="name"
          type="text"
          label="Full name"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          icon={<User size={19} />}
          autoComplete="name"
        />

        <FormField
          id="register-email"
          name="email"
          type="email"
          label="Email address"
          placeholder="name@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          icon={<Mail size={19} />}
          autoComplete="email"
        />

        <PasswordField
          id="register-password"
          name="password"
          label="Password"
          placeholder="Create a strong password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          visible={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
        />

        {/* Strength bar */}
        <div className="strength-panel rounded-xl bg-slate-100 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Password strength
            </p>

            {formData.password && (
              <p className={`text-xs font-bold ${strengthDetails.textColor}`}>
                {strengthDetails.label}
              </p>
            )}
          </div>

          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={`h-1.5 rounded-full transition-colors ${
                  passwordScore >= level
                    ? strengthDetails.barColor
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PasswordRule passed={passwordRules.length} text="8+ characters" />

            <PasswordRule passed={passwordRules.uppercase} text="Uppercase" />

            <PasswordRule passed={passwordRules.lowercase} text="Lowercase" />

            <PasswordRule passed={passwordRules.number} text="One number" />
          </div>
        </div>

        <PasswordField
          id="confirm-password"
          name="confirmPassword"
          label="Confirm password"
          placeholder="Repeat your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          visible={showConfirmPassword}
          onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <LoaderCircle size={19} className="animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* OAuth registration */}
      <OAuthButtons />

      {/* Login switch */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-bold text-blue-700 transition hover:text-blue-900 focus:outline-none focus:underline"
        >
          Log in
        </Link>
      </p>

      {/* Security message */}
      <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400">
        <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
        Your password will be encrypted securely.
      </div>
    </div>
  );
}

function FormField({
  id,
  name,
  type,
  label,
  placeholder,
  value,
  onChange,
  error,
  icon,
  autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-13 w-full rounded-xl border bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
          }`}
        />
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-500"
        >
          <AlertCircle size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  error,
  visible,
  onToggle,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <LockKeyhole
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
        />

        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-13 w-full rounded-xl border bg-white pl-12 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
          }`}
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-500"
        >
          <AlertCircle size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordRule({ passed, text }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        passed ? "font-medium text-emerald-700" : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          passed
            ? "bg-emerald-600 text-white"
            : "border border-slate-300 bg-white"
        }`}
      >
        {passed && <Check size={11} />}
      </span>

      {text}
    </div>
  );
}

function getPasswordStrength(score) {
  if (score <= 1) {
    return {
      label: "Weak",
      barColor: "bg-red-500",
      textColor: "text-red-600",
    };
  }

  if (score === 2) {
    return {
      label: "Fair",
      barColor: "bg-amber-500",
      textColor: "text-amber-600",
    };
  }

  if (score === 3) {
    return {
      label: "Good",
      barColor: "bg-blue-500",
      textColor: "text-blue-600",
    };
  }

  return {
    label: "Strong",
    barColor: "bg-emerald-500",
    textColor: "text-emerald-600",
  };
}

export default RegisterPage;
