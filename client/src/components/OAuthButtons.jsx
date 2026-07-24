import { getOAuthUrl } from "../utils/oauth";

export default function OAuthButtons() {
  function handleGoogleLogin() {
    window.location.href = getOAuthUrl("google");
  }

  function handleGitHubLogin() {
    window.location.href = getOAuthUrl("github");
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Or
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-1.99 3.02v2.54h3.23c1.89-1.74 2.98-4.31 2.98-7.41Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.89 6.62-2.36l-3.23-2.54c-.9.6-2.04.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.61A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.46H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.54l3.34-2.61Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.86-2.86C16.95 2.96 14.7 2 12 2a10 10 0 0 0-8.95 5.46l3.34 2.61C7.18 7.7 9.39 5.94 12 5.94Z"
              />
            </svg>
          </span>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={handleGitHubLogin}
          className="group flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-slate-900 bg-slate-900 px-4 text-sm font-bold text-white shadow-xs transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.426 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.343-3.369-1.343-.455-1.158-1.11-1.466-1.11-1.466-.908-.621.069-.608.069-.608 1.004.071 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.349-1.088.635-1.338-2.221-.253-4.555-1.112-4.555-4.946 0-1.092.39-1.985 1.029-2.684-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.56 9.56 0 0 1 12 6.844a9.57 9.57 0 0 1 2.504.337c1.909-1.294 2.748-1.025 2.748-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.684 0 3.844-2.337 4.69-4.566 4.938.359.31.678.921.678 1.856 0 1.34-.012 2.421-.012 2.75 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.523 2 12 2Z" />
            </svg>
          </span>
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}
