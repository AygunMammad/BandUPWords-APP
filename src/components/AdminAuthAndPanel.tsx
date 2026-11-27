import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { VocabSection, VocabWord } from '../types';

interface AdminLoginViewProps {
  onAuthenticated: (token: string, email: string) => void;
  onBackToStudentLogin: () => void;
}

interface AdminStatusResponse {
  ownerEmail: string;
  envPasscodeActive: boolean;
  isClaimed: boolean;
  needsFirstRunClaim: boolean;
  authenticated: boolean;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onAuthenticated,
  onBackToStudentLogin,
}) => {
  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((data: AdminStatusResponse) => {
        if (!active) return;
        setStatus(data);
        setEmail(data.ownerEmail || '');
      })
      .catch(() => {
        if (active) setErrorMsg('Could not reach authentication server.');
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Could not claim owner admin account.');
        return;
      }
      setSuccessMsg('Owner administrator account configured. Opening dashboard...');
      setTimeout(() => onAuthenticated(data.token, data.email), 350);
    } catch {
      setErrorMsg('Network error while setting up administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Invalid administrator credentials.');
        return;
      }
      setSuccessMsg('Verified! Opening Admin Dashboard...');
      setTimeout(() => onAuthenticated(data.token, data.email), 300);
    } catch {
      setErrorMsg('Network error while signing in.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFirstRun = Boolean(status?.needsFirstRunClaim);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 md:p-8 bg-light-surface text-light-on-surface">
      <main className="w-full max-w-md flex flex-col gap-6">
        <header className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-[12px] bg-light-primary text-light-on-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined material-symbols-filled text-[28px]" aria-hidden="true">
              admin_panel_settings
            </span>
          </div>
          <h1 className="font-display text-[28px] md:text-[36px] font-bold text-light-on-surface text-balance">
            Admin Login
          </h1>
          <p className="font-body text-[14px] text-light-on-surface-variant text-pretty">
            Restricted to the website owner to manage BandUp Words vocabulary.
          </p>
        </header>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[12px] bg-error-container border border-error text-on-error-container p-3.5 font-label text-[13px] font-semibold text-center"
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-[12px] bg-success-container border border-success text-on-success-container p-3.5 font-label text-[13px] font-semibold text-center">
            {successMsg}
          </div>
        )}

        {statusLoading ? (
          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm text-center font-body text-[14px] text-light-on-surface-variant">
            Checking administrator access status...
          </section>
        ) : isFirstRun ? (
          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
            <div className="rounded-[12px] bg-light-surface-container-low p-3.5 flex flex-col gap-1">
              <span className="font-label text-[12px] font-semibold text-light-secondary">
                First-Run Owner Setup
              </span>
              <p className="font-body text-[13px] text-light-on-surface">
                Set the single administrator password for website owner{' '}
                <strong>{status?.ownerEmail}</strong>. This locks after setup.
              </p>
            </div>

            <form onSubmit={handleClaim} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-label text-[13px] font-semibold text-light-on-surface">
                  Website owner email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[15px] text-light-on-surface focus:border-light-primary focus:ring-2 focus:ring-light-primary-container focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-label text-[13px] font-semibold text-light-on-surface">
                  Create admin password (min 8 chars)
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter strong password"
                  className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[15px] text-light-on-surface focus:border-light-primary focus:ring-2 focus:ring-light-primary-container focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-label text-[13px] font-semibold text-light-on-surface">
                  Confirm admin password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[15px] text-light-on-surface focus:border-light-primary focus:ring-2 focus:ring-light-primary-container focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[15px] font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? 'Securing Admin Account...' : 'Claim Owner Admin & Enter'}
              </button>
            </form>
          </section>
        ) : (
          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-label text-[13px] font-semibold text-light-on-surface">
                  Owner administrator email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={status?.ownerEmail || 'owner@example.com'}
                  className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[15px] text-light-on-surface focus:border-light-primary focus:ring-2 focus:ring-light-primary-container focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-label text-[13px] font-semibold text-light-on-surface">
                  Administrator password
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[15px] text-light-on-surface focus:border-light-primary focus:ring-2 focus:ring-light-primary-container focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[15px] font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? 'Verifying...' : 'Sign In to Admin Panel'}
              </button>
            </form>
          </section>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToStudentLogin}
            className="font-label text-[12px] font-semibold text-light-on-surface-variant hover:underline"
          >
            ← Back to student login
          </button>
        </div>
      </main>
    </div>
  );
};

interface AdminPanelViewProps {
  adminToken: string;
  adminEmail: string;
  sections: VocabSection[];
  onSectionsUpdated: (sections: VocabSection[]) => void;
  onSessionExpired: () => void;
  onExitAdmin: () => void;
}

const PART_OF_SPEECH_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'phrase'];
const IELTS_LEVEL_OPTIONS = ['Band 6.0', 'Band 6.5', 'Band 7.0', 'Band 7.5', 'Band 8.0', 'Band 8.5', 'Band 9.0'];
const TOPIC_OPTIONS = [
  'Environment',
  'Education',
  'Technology',
  'Health',
  'Society',
  'Economy',
  'Urban Planning',
  'Academic',
];

interface WordFormState {
  sectionId: string;
  word: string;
  azerbaijani: string;
  definition: string;
  example: string;
  type: string;
  ieltsLevel: string;
  topic: string;
  pronunciation: string;
  collocation: string;
  synonyms: string;
}

const EMPTY_WORD_FORM = (defaultSectionId: string): WordFormState => ({
  sectionId: defaultSectionId,
  word: '',
  azerbaijani: '',
  definition: '',
  example: '',
  type: 'verb',
  ieltsLevel: 'Band 7.5',
  topic: 'Academic',
  pronunciation: '',
  collocation: '',
  synonyms: '',
});

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  adminToken,
  adminEmail,
  sections,
  onSectionsUpdated,
  onSessionExpired,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'words' | 'import' | 'sections'>('words');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Word CRUD state
  const [filterSectionId, setFilterSectionId] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [wordFormOpen, setWordFormOpen] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [wordForm, setWordForm] = useState<WordFormState>(() =>
    EMPTY_WORD_FORM(sections[0]?.id || '')
  );
  const [wordSaving, setWordSaving] = useState(false);

  // Bulk import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importTargetMode, setImportTargetMode] = useState<'new' | 'existing'>('new');
  const [importNewSectionName, setImportNewSectionName] = useState('');
  const [importExistingSectionId, setImportExistingSectionId] = useState(sections[0]?.id || '');
  const [parsedRows, setParsedRows] = useState<Array<Omit<VocabWord, 'id'>>>([]);
  const [importing, setImporting] = useState(false);

  // Section CRUD state
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [editingSecName, setEditingSecName] = useState('');

  const allWords = useMemo(
    () =>
      sections.flatMap((sec) =>
        sec.words.map((w) => ({
          ...w,
          sectionId: sec.id,
          sectionName: sec.name,
        }))
      ),
    [sections]
  );

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allWords.filter((w) => {
      if (filterSectionId !== 'all' && w.sectionId !== filterSectionId) return false;
      if (filterTopic !== 'all' && w.topic.toLowerCase() !== filterTopic.toLowerCase()) return false;
      if (!q) return true;
      return (
        w.word.toLowerCase().includes(q) ||
        w.azerbaijani.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        w.topic.toLowerCase().includes(q)
      );
    });
  }, [allWords, filterSectionId, filterTopic, searchQuery]);

  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const resp = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        ...(options.headers || {}),
      },
    });
    if (resp.status === 401 || resp.status === 403) {
      onSessionExpired();
      throw new Error('Administrator session expired. Please sign in again.');
    }
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  };

  // --- Word CRUD Handlers ---
  const openAddWordForm = () => {
    setEditingWordId(null);
    setWordForm(EMPTY_WORD_FORM(filterSectionId !== 'all' ? filterSectionId : sections[0]?.id || ''));
    setWordFormOpen(true);
    setStatusBanner(null);
  };

  const openEditWordForm = (w: VocabWord & { sectionId: string }) => {
    setEditingWordId(w.id);
    setWordForm({
      sectionId: w.sectionId,
      word: w.word,
      azerbaijani: w.azerbaijani,
      definition: w.definition,
      example: w.example,
      type: w.type || 'verb',
      ieltsLevel: w.ieltsLevel || 'Band 7.0',
      topic: w.topic || 'Academic',
      pronunciation: w.pronunciation || '',
      collocation: w.collocation || '',
      synonyms: w.synonyms || '',
    });
    setWordFormOpen(true);
    setStatusBanner(null);
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    setWordSaving(true);
    setStatusBanner(null);
    try {
      if (editingWordId) {
        const data = await adminFetch(`/api/words/${encodeURIComponent(editingWordId)}`, {
          method: 'PATCH',
          body: JSON.stringify(wordForm),
        });
        onSectionsUpdated(data.sections);
        setStatusBanner({ type: 'success', text: `Updated "${wordForm.word}" in database.` });
      } else {
        const data = await adminFetch('/api/words', {
          method: 'POST',
          body: JSON.stringify(wordForm),
        });
        onSectionsUpdated(data.sections);
        setStatusBanner({ type: 'success', text: `Added "${wordForm.word}" to database.` });
      }
      setWordFormOpen(false);
      setEditingWordId(null);
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save vocabulary word.',
      });
    } finally {
      setWordSaving(false);
    }
  };

  const handleDeleteWord = async (wordId: string, label: string) => {
    setStatusBanner(null);
    try {
      const data = await adminFetch(`/api/words/${encodeURIComponent(wordId)}`, {
        method: 'DELETE',
      });
      onSectionsUpdated(data.sections);
      setStatusBanner({ type: 'success', text: `Deleted "${label}".` });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete word.',
      });
    }
  };

  // --- Bulk Excel / CSV Import ---
  const parseBulkFile = async (file: File) => {
    setStatusBanner(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const vocabSheet =
        wb.SheetNames.find((n) => n.trim().toLowerCase() === 'vocabulary') || wb.SheetNames[0];
      if (!vocabSheet) {
        setStatusBanner({ type: 'error', text: 'No readable sheet found in the uploaded file.' });
        return;
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[vocabSheet], {
        defval: '',
      });
      if (rows.length === 0) {
        setStatusBanner({ type: 'error', text: 'The uploaded file has no data rows.' });
        return;
      }

      const pick = (row: Record<string, unknown>, candidates: string[]): string => {
        for (const candidate of candidates) {
          const matchedKey = Object.keys(row).find(
            (k) => k.trim().toLowerCase() === candidate.toLowerCase()
          );
          if (matchedKey && String(row[matchedKey] ?? '').trim()) {
            return String(row[matchedKey]).trim();
          }
        }
        return '';
      };

      const parsed = rows
        .map((row, idx) => {
          const word = pick(row, ['English word', 'Word', 'English']);
          if (!word) return null;
          return {
            index: Number(pick(row, ['#', 'Index', 'No'])) || idx + 1,
            word,
            azerbaijani: pick(row, ['Azerbaijani translation', 'Azerbaijani', 'Translation', 'AZ']) || 'tərcümə',
            definition:
              pick(row, ['English definition', 'Definition', 'Meaning']) ||
              `Academic IELTS word: ${word}.`,
            example:
              pick(row, ['Example sentence', 'Example', 'Sentence']) ||
              `Researchers highlighted "${word}" in the report.`,
            type: pick(row, ['Part of speech', 'Type', 'POS']) || 'noun',
            ieltsLevel: pick(row, ['IELTS level', 'Level', 'Band']) || 'Band 7.0',
            topic: pick(row, ['Topic/category', 'Topic', 'Category']) || 'Academic',
            synonyms: pick(row, ['Synonyms', 'Synonym']),
            collocation: pick(row, ['Collocation', 'Collocations']),
            pronunciation: pick(row, ['Pronunciation', 'IPA']) || `/${word}/`,
            source: pick(row, ['Source']) || file.name.replace(/\.(xlsx|xls|csv)$/i, ''),
          };
        })
        .filter((r): r is Omit<VocabWord, 'id'> => r !== null);

      if (parsed.length === 0) {
        setStatusBanner({
          type: 'error',
          text: 'No valid rows found. Ensure your file includes an "English word" or "Word" column.',
        });
        return;
      }

      setParsedRows(parsed);
      setImportNewSectionName(file.name.replace(/\.(xlsx|xls|csv)$/i, '').replace(/\s+/g, '_'));
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Failed to parse file. Please upload a valid .xlsx, .xls, or .csv file.',
      });
    }
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setStatusBanner(null);
    try {
      const payload =
        importTargetMode === 'existing' && importExistingSectionId
          ? { sectionId: importExistingSectionId, words: parsedRows }
          : { sectionName: importNewSectionName.trim() || 'Imported_Vocabulary', words: parsedRows };

      const data = await adminFetch('/api/words/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSectionsUpdated(data.sections);
      setStatusBanner({
        type: 'success',
        text: `Imported ${data.importedCount} vocabulary words into persistent database.`,
      });
      setParsedRows([]);
      setImportNewSectionName('');
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk import failed.',
      });
    } finally {
      setImporting(false);
    }
  };

  const buildSampleRows = () => [
    {
      'English word': 'coherent',
      'Azerbaijani translation': 'məntiqli, ardıcıl',
      'English definition': 'Logical and consistent; easy to understand.',
      'Example sentence': 'She presented a coherent argument in her Task 2 essay.',
      'Part of speech': 'adjective',
      'IELTS level': 'Band 7.5',
      'Topic/category': 'Academic',
      Synonyms: 'logical, structured',
      Collocation: 'coherent argument',
      Pronunciation: '/kəʊˈhɪə.rənt/',
    },
    {
      'English word': 'catalyst',
      'Azerbaijani translation': 'katalizator, təkanverici',
      'English definition': 'A person or event that precipitates major change.',
      'Example sentence': 'Clean transit investment became a catalyst for urban renewal.',
      'Part of speech': 'noun',
      'IELTS level': 'Band 8.0',
      'Topic/category': 'Urban Planning',
      Synonyms: 'stimulus, trigger',
      Collocation: 'catalyst for change',
      Pronunciation: '/ˈkæt.əl.ɪst/',
    },
  ];

  const handleDownloadSampleXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(buildSampleRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vocabulary');
    XLSX.writeFile(wb, 'BandUp_Sample_Vocabulary.xlsx');
  };

  const handleDownloadSampleCsv = () => {
    const ws = XLSX.utils.json_to_sheet(buildSampleRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BandUp_Sample_Vocabulary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Section Management Handlers ---
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setStatusBanner(null);
    try {
      const data = await adminFetch('/api/sections', {
        method: 'POST',
        body: JSON.stringify({ name: newSectionName.trim() }),
      });
      onSectionsUpdated(data.sections);
      setNewSectionName('');
      setStatusBanner({ type: 'success', text: 'New vocabulary section created.' });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not create section.',
      });
    }
  };

  const handleRenameSection = async (secId: string) => {
    if (!editingSecName.trim()) return;
    setStatusBanner(null);
    try {
      const data = await adminFetch(`/api/sections/${encodeURIComponent(secId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingSecName.trim() }),
      });
      onSectionsUpdated(data.sections);
      setEditingSecId(null);
      setStatusBanner({ type: 'success', text: 'Section renamed.' });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not rename section.',
      });
    }
  };

  const handleDeleteSection = async (secId: string, name: string) => {
    setStatusBanner(null);
    try {
      const data = await adminFetch(`/api/sections/${encodeURIComponent(secId)}`, {
        method: 'DELETE',
      });
      onSectionsUpdated(data.sections);
      setStatusBanner({ type: 'success', text: `Deleted section "${name}".` });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete section.',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-light-surface text-light-on-surface">
      {/* Admin-only Header */}
      <header className="bg-light-surface-container-lowest border-b border-light-outline-variant sticky top-0 z-30">
        <div className="w-full max-w-5xl mx-auto px-5 md:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-[12px] bg-light-primary flex items-center justify-center text-light-on-primary">
              <span className="material-symbols-outlined material-symbols-filled text-[18px]" aria-hidden="true">
                admin_panel_settings
              </span>
            </span>
            <div className="flex flex-col">
              <span className="font-display text-[18px] font-semibold text-light-on-surface">
                BandUp Words Admin
              </span>
              <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                Owner: {adminEmail}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-4 py-1.5 rounded-full border border-light-outline-variant font-label text-[12px] font-semibold text-light-on-surface hover:bg-light-surface-container-low whitespace-nowrap"
            >
              Student View
            </button>
            <button
              type="button"
              onClick={onSessionExpired}
              className="px-4 py-1.5 rounded-full bg-error-container text-on-error-container font-label text-[12px] font-semibold hover:opacity-90 whitespace-nowrap"
            >
              Sign Out Admin
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-6 py-6 flex flex-col gap-6">
        {/* Top Admin Stats & Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 rounded-full bg-light-surface-container-low border border-light-outline-variant">
            <button
              type="button"
              onClick={() => setActiveTab('words')}
              className={`px-4 py-1.5 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'words'
                  ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                  : 'text-light-on-surface-variant hover:text-light-on-surface'
              }`}
            >
              Vocabulary Words ({allWords.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-4 py-1.5 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'import'
                  ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                  : 'text-light-on-surface-variant hover:text-light-on-surface'
              }`}
            >
              Excel / CSV Import
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={`px-4 py-1.5 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'sections'
                  ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                  : 'text-light-on-surface-variant hover:text-light-on-surface'
              }`}
            >
              Sections ({sections.length})
            </button>
          </div>

          {activeTab === 'words' && (
            <button
              type="button"
              onClick={openAddWordForm}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm hover:opacity-95 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                add
              </span>
              <span>Add Word</span>
            </button>
          )}
        </div>

        {statusBanner && (
          <div
            role="status"
            className={`rounded-[12px] border px-4 py-3 font-label text-[13px] font-semibold ${
              statusBanner.type === 'success'
                ? 'bg-success-container border-success text-on-success-container'
                : 'bg-error-container border-error text-on-error-container'
            }`}
          >
            {statusBanner.text}
          </div>
        )}

        {/* TAB 1: Vocabulary Words Manager */}
        {activeTab === 'words' && (
          <div className="flex flex-col gap-4">
            {/* Add / Edit Word Form */}
            {wordFormOpen && (
              <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-primary p-6 shadow-md flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
                    {editingWordId ? 'Edit Vocabulary Word' : 'Add New Vocabulary Word'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setWordFormOpen(false)}
                    className="font-label text-[13px] font-semibold text-light-on-surface-variant hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSaveWord} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      English word *
                    </span>
                    <input
                      type="text"
                      required
                      value={wordForm.word}
                      onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })}
                      placeholder="e.g. mitigate"
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      Azerbaijani translation *
                    </span>
                    <input
                      type="text"
                      required
                      value={wordForm.azerbaijani}
                      onChange={(e) => setWordForm({ ...wordForm, azerbaijani: e.target.value })}
                      placeholder="e.g. yüngülləşdirmək, azaltmaq"
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      English definition *
                    </span>
                    <input
                      type="text"
                      required
                      value={wordForm.definition}
                      onChange={(e) => setWordForm({ ...wordForm, definition: e.target.value })}
                      placeholder="e.g. To make something less harmful, unpleasant, or severe."
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      Example sentence *
                    </span>
                    <input
                      type="text"
                      required
                      value={wordForm.example}
                      onChange={(e) => setWordForm({ ...wordForm, example: e.target.value })}
                      placeholder="e.g. Planting urban trees helps mitigate extreme summer heat."
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      Part of speech *
                    </span>
                    <select
                      value={wordForm.type}
                      onChange={(e) => setWordForm({ ...wordForm, type: e.target.value })}
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    >
                      {PART_OF_SPEECH_OPTIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      IELTS level *
                    </span>
                    <select
                      value={wordForm.ieltsLevel}
                      onChange={(e) => setWordForm({ ...wordForm, ieltsLevel: e.target.value })}
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    >
                      {IELTS_LEVEL_OPTIONS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      Topic / category *
                    </span>
                    <input
                      type="text"
                      required
                      list="topic-suggestions"
                      value={wordForm.topic}
                      onChange={(e) => setWordForm({ ...wordForm, topic: e.target.value })}
                      placeholder="e.g. Environment"
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                    <datalist id="topic-suggestions">
                      {TOPIC_OPTIONS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface">
                      Vocabulary Section *
                    </span>
                    <select
                      value={wordForm.sectionId}
                      onChange={(e) => setWordForm({ ...wordForm, sectionId: e.target.value })}
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                      IPA pronunciation (optional)
                    </span>
                    <input
                      type="text"
                      value={wordForm.pronunciation}
                      onChange={(e) => setWordForm({ ...wordForm, pronunciation: e.target.value })}
                      placeholder="/ˈmɪt.ɪ.ɡeɪt/"
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 font-mono text-[13px] focus:border-light-primary focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                      Collocation (optional)
                    </span>
                    <input
                      type="text"
                      value={wordForm.collocation}
                      onChange={(e) => setWordForm({ ...wordForm, collocation: e.target.value })}
                      placeholder="mitigate the effects"
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                      Synonyms (optional)
                    </span>
                    <input
                      type="text"
                      value={wordForm.synonyms}
                      onChange={(e) => setWordForm({ ...wordForm, synonyms: e.target.value })}
                      placeholder="alleviate, reduce, ease"
                      className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                  </label>

                  <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWordFormOpen(false)}
                      className="px-5 py-2.5 rounded-full border border-light-outline-variant font-label text-[13px] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={wordSaving}
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
                    >
                      {wordSaving
                        ? 'Saving...'
                        : editingWordId
                        ? 'Save Changes'
                        : 'Add Word to Database'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Filters */}
            <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search English, AZ, definition..."
                className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
              />
              <select
                value={filterSectionId}
                onChange={(e) => setFilterSectionId(e.target.value)}
                aria-label="Filter by section"
                className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
              >
                <option value="all">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                aria-label="Filter by topic"
                className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
              >
                <option value="all">All Topics</option>
                {Array.from(new Set(allWords.map((w) => w.topic).filter(Boolean))).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </section>

            {/* Word List */}
            <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
                  Database Vocabulary ({filteredWords.length})
                </h2>
              </div>

              {filteredWords.length === 0 ? (
                <p className="font-body text-[14px] text-light-on-surface-variant py-6 text-center">
                  No vocabulary words match your filter.
                </p>
              ) : (
                <div className="divide-y divide-light-outline-variant">
                  {filteredWords.map((w) => (
                    <div
                      key={w.id}
                      className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-title text-[17px] font-semibold text-light-on-surface">
                            {w.word}
                          </span>
                          <span className="font-body text-[14px] text-light-secondary font-medium">
                            {w.azerbaijani}
                          </span>
                        </div>
                        <p className="font-label text-[12px] text-light-on-surface-variant">
                          {w.type} · {w.ieltsLevel} · {w.topic} · {w.sectionName}
                        </p>
                        <p className="font-body text-[13px] text-light-on-surface">{w.definition}</p>
                        <p className="font-body text-[12px] text-light-on-surface-variant italic">
                          &ldquo;{w.example}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditWordForm(w)}
                          className="px-4 py-1.5 rounded-full border border-light-outline-variant font-label text-[12px] font-semibold text-light-on-surface hover:bg-light-surface-container-low"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWord(w.id, w.word)}
                          className="px-4 py-1.5 rounded-full bg-error-container text-on-error-container font-label text-[12px] font-semibold hover:opacity-90"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: Bulk Excel / CSV Import */}
        {activeTab === 'import' && (
          <div className="flex flex-col gap-6">
            <section
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) parseBulkFile(file);
              }}
              className={`bg-light-surface-container-lowest rounded-[16px] border-2 border-dashed p-8 text-center flex flex-col items-center gap-4 transition-colors ${
                dragOver ? 'border-bright-blue bg-light-surface-container-low' : 'border-light-primary'
              }`}
            >
              <span className="w-14 h-14 rounded-full bg-light-secondary-container text-light-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                  upload_file
                </span>
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="font-headline text-[22px] font-semibold text-light-on-surface">
                  Bulk Import Vocabulary (Excel or CSV)
                </h1>
                <p className="font-body text-[14px] text-light-on-surface-variant max-w-lg">
                  Drag &amp; drop an <code className="font-mono">.xlsx</code>,{' '}
                  <code className="font-mono">.xls</code>, or{' '}
                  <code className="font-mono">.csv</code> file with columns:{' '}
                  <strong>
                    English word, Azerbaijani translation, English definition, Example sentence, Part of speech, IELTS level, Topic/category
                  </strong>
                  .
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parseBulkFile(file);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm hover:opacity-95"
                >
                  Choose Excel or CSV file
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleXlsx}
                  className="px-4 py-2 rounded-full border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-label text-[13px] font-semibold hover:bg-light-surface-container-low"
                >
                  Download sample .xlsx
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-4 py-2 rounded-full border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-label text-[13px] font-semibold hover:bg-light-surface-container-low"
                >
                  Download sample .csv
                </button>
              </div>
            </section>

            {parsedRows.length > 0 && (
              <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
                    Import Preview ({parsedRows.length} rows ready)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-light-surface-container-low rounded-[12px] p-4">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 font-label text-[13px] font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={importTargetMode === 'new'}
                        onChange={() => setImportTargetMode('new')}
                      />
                      Create new section
                    </label>
                    <label className="inline-flex items-center gap-1.5 font-label text-[13px] font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={importTargetMode === 'existing'}
                        onChange={() => setImportTargetMode('existing')}
                      />
                      Add to existing section
                    </label>
                  </div>

                  {importTargetMode === 'new' ? (
                    <input
                      type="text"
                      value={importNewSectionName}
                      onChange={(e) => setImportNewSectionName(e.target.value)}
                      placeholder="New section name"
                      className="rounded-[10px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    />
                  ) : (
                    <select
                      value={importExistingSectionId}
                      onChange={(e) => setImportExistingSectionId(e.target.value)}
                      className="rounded-[10px] border border-light-outline-variant bg-light-surface-container-lowest px-3.5 py-2 text-[14px] focus:border-light-primary focus:outline-none"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="overflow-x-auto rounded-[12px] border border-light-outline-variant">
                  <table className="w-full text-left font-body text-[13px]">
                    <thead className="bg-light-surface-container-low font-label text-[12px] font-semibold text-light-on-surface">
                      <tr>
                        <th className="p-2.5">English word</th>
                        <th className="p-2.5">Azerbaijani</th>
                        <th className="p-2.5">Part of speech</th>
                        <th className="p-2.5">IELTS level</th>
                        <th className="p-2.5">Topic</th>
                        <th className="p-2.5">Definition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-outline-variant">
                      {parsedRows.slice(0, 12).map((r, i) => (
                        <tr key={`${r.word}-${i}`}>
                          <td className="p-2.5 font-title font-semibold">{r.word}</td>
                          <td className="p-2.5">{r.azerbaijani}</td>
                          <td className="p-2.5">{r.type}</td>
                          <td className="p-2.5 tabular-nums">{r.ieltsLevel}</td>
                          <td className="p-2.5">{r.topic}</td>
                          <td className="p-2.5 max-w-xs truncate">{r.definition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setParsedRows([])}
                    className="px-4 py-2.5 rounded-full border border-light-outline-variant font-label text-[13px] font-semibold"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleConfirmImport}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
                  >
                    {importing
                      ? 'Importing to Database...'
                      : `Confirm & Import ${parsedRows.length} Words`}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {/* TAB 3: Sections Management */}
        {activeTab === 'sections' && (
          <div className="flex flex-col gap-6">
            <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
              <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
                Create New Vocabulary Section
              </h2>
              <form onSubmit={handleCreateSection} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. IELTS20_Test4_Academic"
                  className="flex-1 rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 text-[14px] focus:border-light-primary focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold whitespace-nowrap"
                >
                  Create Section
                </button>
              </form>
            </section>

            <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
              <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
                Existing Sections
              </h2>
              <div className="divide-y divide-light-outline-variant">
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    {editingSecId === sec.id ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingSecName}
                          onChange={(e) => setEditingSecName(e.target.value)}
                          className="flex-1 min-w-[200px] rounded-[8px] border border-light-primary px-3 py-1.5 font-title text-[15px] bg-light-surface-container-lowest focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameSection(sec.id)}
                          className="px-4 py-1.5 rounded-full bg-light-primary text-light-on-primary font-label text-[12px] font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSecId(null)}
                          className="px-4 py-1.5 rounded-full border border-light-outline-variant font-label text-[12px] font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-title text-[16px] font-semibold text-light-on-surface break-all">
                            {sec.name}
                          </p>
                          <p className="font-body text-[14px] text-light-on-surface-variant tabular-nums">
                            {sec.words.length} words
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSecId(sec.id);
                              setEditingSecName(sec.name);
                            }}
                            className="px-4 py-1.5 rounded-full border border-light-outline-variant font-label text-[13px] font-semibold text-light-on-surface hover:bg-light-surface-container-low"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id, sec.name)}
                            className="px-4 py-1.5 rounded-full bg-error-container text-on-error-container font-label text-[13px] font-semibold hover:opacity-90"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
