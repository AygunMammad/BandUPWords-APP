import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginViewProps {
  onOpenAdminLogin: () => void;
  authError?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onOpenAdminLogin,
  authError,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(authError ?? null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Google sign-in failed. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 md:p-8 bg-light-surface text-light-on-surface">
      <main className="w-full max-w-md flex flex-col gap-6">
        <header className="flex flex-col items-center text-center gap-2">
          {!imgFailed ? (
            <img
              src="/src/assets/images/campus_login_library_1795769769158.jpg"
              alt="University campus library with students studying"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-40 object-cover rounded-[12px] border border-light-outline-variant shadow-sm"
            />
          ) : (
            <div className="w-full h-40 rounded-[12px] border border-light-outline-variant bg-light-surface-container-low flex flex-col items-center justify-center gap-2 text-light-primary">
              <span
                className="material-symbols-outlined material-symbols-filled text-[36px]"
                aria-hidden="true"
              >
                local_library
              </span>
              <span className="font-label text-[13px] font-semibold">Campus Study Library</span>
            </div>
          )}

          <div className="flex flex-col gap-1 pt-2">
            <h1 className="font-display text-[28px] leading-[34px] md:text-[38px] md:leading-[46px] font-bold tracking-tight text-light-on-surface text-balance">
              BandUp Words
            </h1>
            <p className="font-body text-[16px] leading-[26px] text-light-on-surface-variant text-pretty max-w-xs mx-auto">
              Boost your IELTS vocabulary with flashcards and active Speaking, Writing, Reading &amp; Listening practice.
            </p>
          </div>
        </header>

        <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 md:p-8 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col gap-1 text-center">
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
              Sign in to continue
            </h2>
            <p className="font-body text-[14px] text-light-on-surface-variant">
              Save your XP, study streak, and compete on the IELTS Leaderboard.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface shadow-sm hover:bg-light-surface-container-low active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span className="font-label text-[15px] font-semibold whitespace-nowrap">
              {loading ? 'Connecting to Google...' : 'Continue with Google'}
            </span>
          </button>

          {errorMsg && (
            <div className="rounded-[12px] bg-error-container text-on-error-container px-4 py-2.5 font-label text-[13px] font-semibold text-center">
              {errorMsg}
            </div>
          )}
        </section>

        <div className="text-center">
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="font-label text-[12px] font-semibold text-light-on-surface-variant hover:underline"
          >
            Admin login
          </button>
        </div>
      </main>
    </div>
  );
};
