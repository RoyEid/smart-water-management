import { useState, useEffect } from "react";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import RecoveryLayout from "../components/RecoveryLayout";
import api from "../services/api";

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setFormData({
      password: "",
      confirmPassword: "",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [location.pathname]);

  const email = location.state?.email || "";
  const resetToken = location.state?.resetToken || "";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRules = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  };

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

    setServerError("");
  }

  function validateForm() {
    const newErrors = {};

    if (!Object.values(passwordRules).every(Boolean)) {
      newErrors.password =
        "Your password does not meet all requirements.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      formData.confirmPassword !== formData.password
    ) {
      newErrors.confirmPassword =
        "The passwords do not match.";
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const newErrors = validateForm();
    setErrors(newErrors);
    setServerError("");

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/reset-password",
        {
          email,
          resetToken,
          password: formData.password,
        },
      );

      navigate("/login", {
        replace: true,
        state: {
          message:
            response.data.message ||
            "Password changed successfully. You can now log in.",
        },
      });
    } catch (error) {
      setServerError(
        error.response?.data?.message ||
          "Unable to reset your password. Please restart the recovery process.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!email || !resetToken) {
    return (
      <RecoveryLayout>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertCircle size={27} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Reset link unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your password-reset session is missing or expired.
            Return to Login and choose Forgot Password again.
          </p>
        </div>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout>
      {/* Icon */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
        <LockKeyhole size={27} />
      </div>

      {/* Heading */}
      <div>
        <p className="mb-2 text-sm font-semibold text-blue-700">
          Password recovery
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Create a new password
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Choose a secure password that you have not used before.
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
        className="mt-7 space-y-5"
        onSubmit={handleSubmit}
        noValidate
      >
        <PasswordField
          id="new-password"
          name="password"
          label="New password"
          placeholder="Enter your new password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          visible={showPassword}
          onToggle={() =>
            setShowPassword(!showPassword)
          }
        />

        {/* Password requirements */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-3">
          <PasswordRule
            passed={passwordRules.length}
            text="8+ characters"
          />

          <PasswordRule
            passed={passwordRules.uppercase}
            text="Uppercase"
          />

          <PasswordRule
            passed={passwordRules.lowercase}
            text="Lowercase"
          />

          <PasswordRule
            passed={passwordRules.number}
            text="One number"
          />
        </div>

        <PasswordField
          id="confirm-new-password"
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Repeat your new password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          visible={showConfirmPassword}
          onToggle={() =>
            setShowConfirmPassword(
              !showConfirmPassword,
            )
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <LoaderCircle
                size={19}
                className="animate-spin"
              />
              Updating password...
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              Save new password
            </>
          )}
        </button>
      </form>
    </RecoveryLayout>
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
          aria-describedby={
            error ? `${id}-error` : undefined
          }
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
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
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
        passed
          ? "font-medium text-emerald-700"
          : "text-slate-400"
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

export default ResetPasswordPage;