import React, { useState } from 'react';

interface LoginViewProps {
  initialFirstName?: string;
  initialLastName?: string;
  onLogin: (firstName: string, lastName: string) => void;
  onOpenAdminLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  initialFirstName = '',
  initialLastName = '',
  onLogin,
  onOpenAdminLogin,
}) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [imgFailed, setImgFailed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim() || 'Leyla';
    const cleanLast = lastName.trim() || 'Mammadova';
    setFeedback(`Welcome, ${cleanFirst}! Your IELTS study streak starts now.`);
    setTimeout(() => {
      onLogin(cleanFirst, cleanLast);
    }, 350);
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
              <span className="material-symbols-outlined material-symbols-filled text-[36px]" aria-hidden="true">
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

        <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 w-full">
              <span className="font-label text-[13px] font-semibold text-light-on-surface">First name</span>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Leyla"
                className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[16px] text-light-on-surface placeholder:text-light-outline focus:border-light-primary focus:ring-2 focus:ring-light-primary-container focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 w-full">
              <span className="font-label text-[13px] font-semibold text-light-on-surface">Last name</span>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Mammadova"
                className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[16px] text-light-on-surface placeholder:text-light-outline focus:border-light-primary focus:ring-2 focus:ring-light-primary-container focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary shadow-md hover:opacity-95 active:scale-[0.98] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary"
            >
              <span className="font-label text-[15px] font-semibold whitespace-nowrap">Start Learning</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>

          {feedback && (
            <div className="rounded-[12px] bg-success-container text-on-success-container px-4 py-2.5 font-label text-[13px] font-semibold text-center">
              {feedback}
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
