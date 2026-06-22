"use client";

import { useEffect, useMemo, useState } from "react";
import { SUBJECTS, allocateSubjects, buildBatchPlan } from "@/lib/constants";
import { demoExam } from "@/lib/demo-exam";
import { deleteExam, getPreferences, getProfile, getTodayUsage, loadExams, loadResearch, loadSessionKey, recordUsage, saveExam, saveProfile, saveResearch, saveSessionKey } from "@/lib/client-store";
import { adaptivePromptFromExams, funTestName } from "@/lib/analytics";
import ProgressLab from "./ProgressLab";
import ResultsReport from "./ResultsReport";
import ResearchIntelligence from "./ResearchIntelligence";
import SettingsPanel from "./SettingsPanel";

const navItems = [
  ["dashboard", "grid", "Dashboard"], ["generator", "spark", "Question generator"],
  ["library", "book", "My test library"], ["progress", "chart", "Progress report"], ["research", "radar", "Research signals"]
];

// Legacy surfaces remain as lightweight fallbacks for previously cached records.
const ResultsSurface = ResultsReport || Results;
const ResearchSurface = ResearchIntelligence || ResearchLab;
const SettingsSurface = SettingsPanel || SettingsModal;

const iconPaths = {
  grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  spark: ["M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z", "M18 14l.7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7z"],
  book: ["M4 5.5A2.5 2.5 0 016.5 3H11v16H6.5A2.5 2.5 0 004 21z", "M20 5.5A2.5 2.5 0 0017.5 3H13v16h4.5A2.5 2.5 0 0120 21z"],
  radar: ["M12 12l5-5", "M21 12a9 9 0 11-3-6.7", "M17.7 12a5.7 5.7 0 11-1.7-4", "M12 12h.01"],
  settings: ["M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z", "M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.03 1.56V20.3h-3v-.08a1.7 1.7 0 00-1.03-1.56 1.7 1.7 0 00-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 006.6 15a1.7 1.7 0 00-1.56-1.03H5v-3h.04A1.7 1.7 0 006.6 10a1.7 1.7 0 00-.34-1.88l-.06-.06 2.12-2.12.06.06A1.7 1.7 0 0010.26 6.3a1.7 1.7 0 001.03-1.56V4.7h3v.04a1.7 1.7 0 001.03 1.56A1.7 1.7 0 0017.2 6l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0019 10a1.7 1.7 0 001.56 1.03h.04v3h-.04A1.7 1.7 0 0019.4 15z"],
  arrow: ["M5 12h14", "M14 7l5 5-5 5"],
  plus: ["M12 5v14", "M5 12h14"],
  clock: ["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 7v5l3 2"],
  check: ["M5 12l4 4L19 6"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  flag: ["M5 21V4", "M5 5h11l-2 4 2 4H5"],
  key: ["M15 7a4 4 0 11-1.17 2.83L21 17v3h-3v-2h-2v-2h-2l-2.17-2.17", "M6 7h.01"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M7 7l1 14h8l1-14"],
  search: ["M11 18a7 7 0 100-14 7 7 0 000 14z", "M16 16l5 5"],
  brain: ["M9.5 4.5A3 3 0 006.6 8a3 3 0 00-1 5.7A3.5 3.5 0 009 19.9c.7 0 1.4-.2 2-.6V5.8a3 3 0 00-1.5-1.3z", "M14.5 4.5A3 3 0 0117.4 8a3 3 0 011 5.7 3.5 3.5 0 01-3.4 6.2c-.7 0-1.4-.2-2-.6V5.8a3 3 0 011.5-1.3z", "M8 10h3", "M13 14h3"],
  chart: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"]
};

function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(iconPaths[name] || []).map((d, i) => <path d={d} key={i} />)}</svg>;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
  return h ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Logo() {
  return <div className="brand"><span className="brand-mark"><span /></span><span>PulseTest<span className="brand-dot">-AI</span></span></div>;
}

export default function PulseTestApplication() {
  const [view, setView] = useState("dashboard");
  const [exams, setExams] = useState([]);
  const [profile, setProfile] = useState({ name: "Doctor", streak: 0 });
  const [currentExam, setCurrentExam] = useState(null);
  const [research, setResearchState] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setExams(loadExams());
      setProfile(getProfile());
      setResearchState(loadResearch());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!toast) return; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer);
  }, [toast]);

  function navigate(next) { setView(next); setCurrentExam(null); setSidebarOpen(false); }

  async function persistExam(exam) {
    const next = await saveExam(exam); setExams(next);
  }

  function openExam(exam) {
    setCurrentExam(exam); setView(exam.status === "completed" ? "results" : "exam");
  }

  function startDemo() {
    const fresh = { ...demoExam, id: crypto.randomUUID(), title: "The Consultant Raised One Eyebrow · Demo", createdAt: new Date().toISOString() };
    persistExam(fresh); openExam(fresh);
  }

  function startDaily() {
    const day = new Date().toISOString().slice(0, 10); const existing = exams.find((exam) => exam.id === `daily-${day}`);
    if (existing) { openExam(existing); return; }
    const source = demoExam.questions[new Date().getDate() % demoExam.questions.length];
    const question = { ...source, id: `daily-question-${day}`, number: 1 };
    const fresh = { ...demoExam, id: `daily-${day}`, title: `Daily Case: ${source.sourceTags[0]} Has Entered the Chat`, createdAt: new Date().toISOString(), status: "ready", config: { count: 1, difficulty: source.difficulty, mode: "Daily adaptive case" }, questions: [question] };
    persistExam(fresh); openExam(fresh);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top"><Logo /><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><Icon name="close" /></button></div>
        <nav className="nav-list">
          <p className="nav-label">Workspace</p>
          {navItems.map(([id, icon, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}><Icon name={icon} /><span>{label}</span>{id === "research" && research && <i />}</button>)}
        </nav>
        <div className="sidebar-foot">
          <div className="streak-card"><span className="flame">✦</span><div><b>{profile.streak || 0} day streak</b><small>Keep the chain alive</small></div></div>
          <button className="profile-row" onClick={() => setSettingsOpen(true)}><span className="avatar">DR</span><span><b>{profile.name || "Doctor"}</b><small>Local study profile</small></span><Icon name="settings" size={17} /></button>
        </div>
      </aside>
      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="top-search"><Icon name="search" size={16} /><span>Search tests and topics</span><kbd>⌘ K</kbd></div>
          <div className="topbar-actions"><span className="date-pill">{new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span><button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Settings"><Icon name="settings" /></button><span className="avatar small">DR</span></div>
        </header>
        <div className="page-wrap">
          {view === "dashboard" && <Dashboard exams={exams} profile={profile} research={research} onNew={() => setView("generator")} onDemo={startDemo} onDaily={startDaily} onOpen={openExam} onResearch={() => setView("research")} />}
          {view === "generator" && <Generator exams={exams} research={research} onCreated={(exam) => { persistExam(exam); openExam(exam); }} onResearch={(value) => { setResearchState(value); saveResearch(value); }} onNeedKey={() => setSettingsOpen(true)} />}
          {view === "library" && <Library exams={exams} onOpen={openExam} onDelete={(id) => { setExams(deleteExam(id)); setToast("Test removed from this device"); }} onNew={() => setView("generator")} />}
          {view === "progress" && <ProgressLab exams={exams} onGenerate={() => setView("generator")} />}
          {view === "research" && <ResearchSurface research={research} onResearch={(value) => { setResearchState(value); saveResearch(value); }} onNeedKey={() => setSettingsOpen(true)} onGenerate={() => setView("generator")} />}
          {view === "exam" && currentExam && <ExamPlayer exam={currentExam} onSave={persistExam} onSubmit={(completed) => { persistExam(completed); setCurrentExam(completed); setView("results"); const today = new Date().toISOString().slice(0, 10); const nextProfile = { ...profile, streak: profile.lastStudyDate === today ? profile.streak : (profile.streak || 0) + 1, lastStudyDate: today }; setProfile(nextProfile); saveProfile(nextProfile); }} onExit={() => navigate("library")} />}
          {view === "results" && currentExam && <ResultsSurface exam={currentExam} exams={exams} research={research} onExit={() => navigate("dashboard")} onLibrary={() => navigate("library")} onProgress={() => navigate("progress")} onNeedKey={() => setSettingsOpen(true)} />}
        </div>
      </main>
      {settingsOpen && <SettingsSurface onClose={() => setSettingsOpen(false)} onSaved={() => { setSettingsOpen(false); setToast("Settings and limits saved"); }} />}
      {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}

function Dashboard({ exams, profile, research, onNew, onDemo, onDaily, onOpen, onResearch }) {
  const completed = exams.filter((item) => item.status === "completed");
  const totalAnswered = completed.reduce((sum, item) => sum + (item.result?.correct || 0) + (item.result?.incorrect || 0), 0);
  const correct = completed.reduce((sum, item) => sum + (item.result?.correct || 0), 0);
  const avg = completed.length ? Math.round(completed.reduce((sum, item) => sum + item.result.percentage, 0) / completed.length) : 0;
  const recent = exams.slice(0, 4);
  return <>
    <section className="welcome-row"><div><p className="eyebrow">YOUR STUDY ROOM</p><h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, <em>{profile.name || "Doctor"}.</em></h1><p className="lead">Train decisions, not just recall. Your next clinical edge starts here.</p></div><button className="primary-button" onClick={onNew}><Icon name="plus" /> Build a new paper</button></section>
    <section className="hero-grid">
      <div className="hero-card dark-card"><div className="hero-copy"><span className="status-chip"><i /> PULSETEST QUALITY PANEL ONLINE</span><h2>A grand test that learns<br />where you hesitate.</h2><p>Generate original, evidence-grounded clinical questions with traps, clues, answer audits and a complete post-test reasoning review.</p><div className="hero-actions"><button className="light-button" onClick={onNew}>Create custom test <Icon name="arrow" /></button><button className="text-button light" onClick={onDemo}>Try 5-question demo</button></div></div><div className="orbit-visual"><div className="orbit one" /><div className="orbit two" /><div className="orbit three" /><div className="brain-core"><Icon name="brain" size={42} /></div><span className="orbit-dot d1" /><span className="orbit-dot d2" /><span className="orbit-dot d3" /></div></div>
      <button className="signal-card" onClick={onResearch}><div className="signal-icon"><Icon name="radar" size={23} /></div><span className="overline">DAILY INTELLIGENCE</span><h3>{research?.headline || "Build today’s exam signal map"}</h3><p>{research?.summary?.slice(0, 145) || "Search current exam trends and guideline-sensitive topics before your next paper is generated."}{research?.summary?.length > 145 ? "…" : ""}</p><span className="card-link">{research ? "View research brief" : "Run deep research"} <Icon name="arrow" size={15} /></span></button>
    </section>
    <section className="metric-grid">
      <Metric label="Average score" value={`${avg}%`} delta={completed.length ? `${completed.length} completed tests` : "Start with the demo"} icon="chart" tone="mint" />
      <Metric label="Questions attempted" value={totalAnswered.toLocaleString("en-IN")} delta={`${correct} answered correctly`} icon="book" tone="sand" />
      <Metric label="Clinical accuracy" value={`${totalAnswered ? Math.round(correct / totalAnswered * 100) : 0}%`} delta="Correct among attempted" icon="check" tone="blue" />
      <Metric label="Current streak" value={`${profile.streak || 0} days`} delta="Consistency compounds" icon="spark" tone="lilac" />
    </section>
    <section className="daily-challenge"><div className="daily-code"><span>DAILY CASE</span><strong>{String(new Date().getDate()).padStart(2, "0")}</strong></div><div className="daily-copy"><span className="overline">LEETCODE MODE · ONE CLINICAL HINGE</span><h3>Today’s case: one minute to commit</h3><p>A fresh attempt every day, followed by the complete trap, clue and related-question loop.</p><div><span>+4 marks</span><span>Hard</span><span>1 question</span></div></div><button className="primary-button" onClick={onDaily}>Solve daily case <Icon name="arrow" size={15} /></button></section>
    <section className="content-grid">
      <div className="panel recent-panel"><div className="panel-head"><div><span className="overline">YOUR PAPERS</span><h3>Recent tests</h3></div>{exams.length > 0 && <button className="text-button">View library <Icon name="arrow" size={14} /></button>}</div>{recent.length ? <div className="test-list">{recent.map((exam) => <button className="test-row" onClick={() => onOpen(exam)} key={exam.id}><span className={`test-glyph ${exam.status}`}><Icon name={exam.status === "completed" ? "check" : "book"} /></span><span className="test-main"><b>{exam.title}</b><small>{exam.questions.length} questions · {formatDate(exam.createdAt)}</small></span><span className="test-score">{exam.status === "completed" ? <><b>{exam.result.percentage}%</b><small>{exam.result.score}/{exam.result.maxScore}</small></> : <><b>Resume</b><small>In progress</small></>}</span><Icon name="arrow" size={16} /></button>)}</div> : <div className="empty-mini"><span><Icon name="book" size={24} /></span><div><b>Your test history will live here</b><p>Take the demo or generate a custom paper to begin.</p></div><button className="secondary-button" onClick={onDemo}>Try demo</button></div>}</div>
      <div className="panel protocol-panel"><div className="panel-head"><div><span className="overline">MEMORY PROTOCOL</span><h3>The 3-pass review</h3></div><span className="tiny-badge">8 min</span></div><div className="protocol-steps"><div><span>01</span><p><b>Find the hinge</b>Identify the single detail that changes the decision.</p></div><div><span>02</span><p><b>Name the trap</b>Say why the tempting option fails here.</p></div><div><span>03</span><p><b>Compress it</b>Turn the rule into one retrieval cue.</p></div></div></div>
    </section>
  </>;
}

function Metric({ label, value, delta, icon, tone }) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon name={icon} /></div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div>; }

function Generator({ exams, research, onCreated, onResearch, onNeedKey }) {
  const [count, setCount] = useState(20); const [difficulty, setDifficulty] = useState("Moderate to high"); const [subjects, setSubjects] = useState(SUBJECTS);
  const [customPrompt, setCustomPrompt] = useState(""); const [useResearch, setUseResearch] = useState(true); const [adaptiveMode, setAdaptiveMode] = useState(getPreferences().adaptiveMode); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState({ done: 0, total: 0, label: "" }); const [error, setError] = useState("");
  const allocation = useMemo(() => allocateSubjects(count, subjects), [count, subjects]);

  function toggleSubject(subject) { setSubjects((current) => current.includes(subject) ? (current.length === 1 ? current : current.filter((item) => item !== subject)) : [...current, subject]); }

  async function callApi(path, body) {
    const key = loadSessionKey();
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...(key ? { "x-openai-key": key } : {}) }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { const err = new Error(data.error || "Request failed"); err.status = response.status; throw err; }
    return data;
  }

  async function generate() {
    const preferences = getPreferences(); const initialUsage = getTodayUsage();
    if (initialUsage.questions + count > preferences.dailyQuestionLimit) { setError(`This would exceed today’s ${preferences.dailyQuestionLimit}-question limit. Change it in Settings or choose a shorter paper.`); return; }
    setBusy(true); setError(""); let activeResearch = research;
    try {
      if (useResearch && (!research || Date.now() - new Date(research.generatedAt).getTime() > 24 * 60 * 60 * 1000)) {
        if (initialUsage.research >= preferences.dailyResearchLimit) throw new Error("Deep Search limit reached. Use the saved brief or raise the limit in Settings.");
        setProgress({ done: 0, total: count, label: "Refreshing the exam signal map…" });
        const data = await callApi("/api/research", {}); activeResearch = data.research; saveResearch(activeResearch); onResearch(activeResearch); recordUsage("research", 1);
      }
      const plan = buildBatchPlan(count, subjects, 10); const questions = []; const coveredTopics = []; const adaptiveProfile = adaptiveMode ? adaptivePromptFromExams(exams) : "Adaptive mode disabled; follow the requested subject blueprint without candidate-history weighting.";
      for (let index = 0; index < plan.length; index += 1) {
        const batch = plan[index]; setProgress({ done: questions.length, total: count, label: `Setting paper · batch ${index + 1} of ${plan.length}` });
        const data = await callApi("/api/generate", {
          ...batch, difficulty, mode: "NEET PG 2026 + AIIMS/INI-CET integrated", customPrompt,
          researchBrief: activeResearch ? `${activeResearch.summary}\nSignals: ${activeResearch.examSignals.join("; ")}\nPriority topics: ${activeResearch.highYieldTopics.map((t) => `${t.subject}: ${t.topic}`).join("; ")}\nDisease watch: ${(activeResearch.diseaseWatch || []).map((t) => `${t.disease}: ${t.examAngle}`).join("; ")}` : "",
          coveredTopics, adaptiveProfile, reasoningEffort: count >= 100 ? "medium" : "high"
        });
        questions.push(...data.questions.map((question) => ({ ...question, researchSources: data.sources || [] }))); coveredTopics.push(...data.questions.flatMap((q) => q.sourceTags));
      }
      setProgress({ done: count, total: count, label: "Paper ready" });
      recordUsage("questions", count);
      onCreated({ id: crypto.randomUUID(), title: funTestName(count), createdAt: new Date().toISOString(), status: "ready", config: { count, difficulty, subjects, customPrompt, usedResearch: useResearch, adaptiveMode, adaptiveProfile }, questions });
    } catch (err) { setError(err.message); if (err.status === 401) onNeedKey(); }
    finally { setBusy(false); }
  }

  return <section className="generator-page"><div className="page-title"><div><span className="overline">PAPER STUDIO</span><h1>Build your next <em>thinking test.</em></h1><p>Set the boundaries. The professor panel handles the clinical complexity.</p></div><span className="model-pill"><i /> OpenAI Responses API</span></div>
    <div className="studio-grid"><div className="panel form-panel">
      <div className="form-section"><div className="section-number">01</div><div className="form-content"><label>Paper length</label><p>Use a short drill or the complete 180-question grand test.</p><div className="count-control"><input type="range" min="5" max="180" step="5" value={count} onChange={(e) => setCount(Number(e.target.value))} /><div><input aria-label="Question count" type="number" min="5" max="180" value={count} onChange={(e) => setCount(Math.min(180, Math.max(5, Number(e.target.value))))} /><span>questions</span></div></div><div className="quick-counts">{[10, 20, 50, 100, 180].map((n) => <button className={count === n ? "active" : ""} onClick={() => setCount(n)} key={n}>{n}{n === 180 && <small> GRAND TEST</small>}</button>)}</div></div></div>
      <div className="form-section"><div className="section-number">02</div><div className="form-content"><label>Subject mix</label><p>Weights remain proportional to your grand-test blueprint.</p><div className="subject-chips">{SUBJECTS.map((subject) => <button key={subject} onClick={() => toggleSubject(subject)} className={subjects.includes(subject) ? "active" : ""}><span>{subjects.includes(subject) && <Icon name="check" size={13} />}</span>{subject}</button>)}</div></div></div>
      <div className="form-section"><div className="section-number">03</div><div className="form-content"><label>Challenge level</label><div className="segmented">{["Moderate", "Moderate to high", "Examiner mode"].map((item) => <button key={item} onClick={() => setDifficulty(item)} className={difficulty === item ? "active" : ""}>{item}</button>)}</div></div></div>
      <div className="form-section"><div className="section-number">04</div><div className="form-content"><label htmlFor="prompt">Your emphasis <span>optional</span></label><p>Ask for specific systems, traps, clinical settings or a revision theme.</p><textarea id="prompt" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="e.g. Emphasize cardio–renal integration, ABG interpretation and immediate-vs-definitive management traps…" maxLength={1200} /><small className="char-count">{customPrompt.length}/1200</small></div></div>
      <label className="research-toggle"><span className={`toggle ${useResearch ? "on" : ""}`} onClick={() => setUseResearch(!useResearch)}><i /></span><span><b>Ground with current research signals</b><small>Refreshes if the saved brief is over 24 hours old. Uses web search and may increase API cost.</small></span><Icon name="radar" /></label>
      <label className="research-toggle adaptive-toggle"><span className={`toggle ${adaptiveMode ? "on" : ""}`} onClick={() => setAdaptiveMode(!adaptiveMode)}><i /></span><span><b>Adaptive candidate model</b><small>Uses your prior answers to focus weak subjects, revisit traps and raise difficulty gradually.</small></span><Icon name="brain" /></label>
      <div className="quality-contract"><span>✓</span><div><b>PulseTest-AI quality contract</b><p>Official exam bodies define paper rules · current clinical authority defines answers · ambiguous questions are replaced, never guessed · adaptation remains non-biased.</p></div></div>
      {error && <div className="error-banner">{error}</div>}
      {busy && <div className="generation-progress"><div><span>{progress.label}</span><b>{progress.done}/{progress.total}</b></div><div className="progress-track"><i style={{ width: `${progress.total ? progress.done / progress.total * 100 : 4}%` }} /></div><small>You can safely retry if a batch is rate-limited. Full tests can take several minutes.</small></div>}
      <button className="primary-button generate-button" disabled={busy} onClick={generate}>{busy ? <><span className="spinner" /> Generating paper…</> : <><Icon name="spark" /> Generate {count} questions <Icon name="arrow" /></>}</button>
    </div>
    <aside className="studio-preview"><div className="preview-card"><span className="overline">LIVE BLUEPRINT</span><h3>Your paper at a glance</h3><div className="paper-ring" style={{ "--progress": `${Math.min(count / 180 * 100, 100) * 3.6}deg` }}><div><strong>{count}</strong><span>questions</span></div></div><dl><div><dt>Format</dt><dd>Single best answer</dd></div><div><dt>Scoring</dt><dd>+4 / −1</dd></div><div><dt>Est. time</dt><dd>{Math.ceil(count * 1.17)} min</dd></div><div><dt>Review</dt><dd>Full reasoning</dd></div></dl></div><div className="allocation-card"><span className="overline">ALLOCATION</span>{allocation.map((item) => <div className="allocation-row" key={item.subject}><span>{item.subject}</span><i><b style={{ width: `${item.count / Math.max(...allocation.map((a) => a.count)) * 100}%` }} /></i><strong>{item.count}</strong></div>)}</div><p className="medical-note">Educational practice only. Generated explanations should be verified against authoritative current guidance before clinical use.</p></aside></div>
  </section>;
}

function Library({ exams, onOpen, onDelete, onNew }) {
  const [filter, setFilter] = useState("all"); const shown = exams.filter((exam) => filter === "all" || exam.status === filter);
  return <section><div className="page-title"><div><span className="overline">ARCHIVE</span><h1>My test <em>library.</em></h1><p>Every generated paper and review, stored on this device.</p></div><button className="primary-button" onClick={onNew}><Icon name="plus" /> New paper</button></div><div className="library-toolbar"><div className="segmented small">{[["all", "All"], ["ready", "In progress"], ["completed", "Completed"]].map(([id, label]) => <button className={filter === id ? "active" : ""} onClick={() => setFilter(id)} key={id}>{label}</button>)}</div><span>{shown.length} papers</span></div>{shown.length ? <div className="library-grid">{shown.map((exam) => <article className="library-card" key={exam.id}><div className="library-cover"><span className={`test-glyph ${exam.status}`}><Icon name={exam.status === "completed" ? "check" : "book"} /></span><span className="tiny-badge">{exam.questions.length}Q</span></div><div><span className="overline">{exam.status === "completed" ? "COMPLETED" : "READY"}</span><h3>{exam.title}</h3><p>{formatDate(exam.createdAt)} · {exam.config?.difficulty}</p>{exam.status === "completed" && <div className="score-strip"><strong>{exam.result.percentage}%</strong><span>{exam.result.correct} correct · {exam.result.incorrect} wrong</span></div>}<div className="library-actions"><button className="secondary-button" onClick={() => onOpen(exam)}>{exam.status === "completed" ? "Review test" : "Start test"} <Icon name="arrow" size={14} /></button><button className="icon-button danger" onClick={() => onDelete(exam.id)} aria-label="Delete test"><Icon name="trash" size={16} /></button></div></div></article>)}</div> : <div className="empty-state"><span><Icon name="book" size={32} /></span><h3>No papers in this view</h3><p>Generate your first custom test and it will appear here.</p><button className="primary-button" onClick={onNew}>Build a paper</button></div>}</section>;
}

function ExamPlayer({ exam, onSave, onSubmit, onExit }) {
  const [index, setIndex] = useState(exam.progress?.index || 0); const [answers, setAnswers] = useState(exam.answers || {}); const [flags, setFlags] = useState(exam.flags || []); const [seconds, setSeconds] = useState(exam.elapsedSeconds || 0); const [palette, setPalette] = useState(false);
  const question = exam.questions[index]; const answered = Object.keys(answers).length;
  useEffect(() => { const timer = setInterval(() => setSeconds((value) => value + 1), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { const timer = setTimeout(() => onSave({ ...exam, answers, flags, elapsedSeconds: seconds, progress: { index } }), 600); return () => clearTimeout(timer); }, [answers, flags, index]); // eslint-disable-line react-hooks/exhaustive-deps
  function choose(id) { setAnswers((current) => ({ ...current, [question.id]: id })); }
  function toggleFlag() { setFlags((current) => current.includes(question.id) ? current.filter((id) => id !== question.id) : [...current, question.id]); }
  function submit() {
    const unanswered = exam.questions.length - answered;
    if (unanswered && !window.confirm(`${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered. Submit anyway?`)) return;
    let correct = 0; let incorrect = 0;
    for (const item of exam.questions) { if (!answers[item.id]) continue; if (answers[item.id] === item.correctOptionId) correct += 1; else incorrect += 1; }
    const score = correct * 4 - incorrect; const maxScore = exam.questions.length * 4;
    onSubmit({ ...exam, status: "completed", answers, flags, elapsedSeconds: seconds, completedAt: new Date().toISOString(), result: { correct, incorrect, unanswered, score, maxScore, percentage: Math.max(0, Math.round(score / maxScore * 100)), accuracy: answered ? Math.round(correct / answered * 100) : 0 } });
  }
  return <div className="exam-shell"><header className="exam-header"><button className="exam-brand" onClick={onExit}><span className="brand-mark"><span /></span><b>PulseTest-AI</b></button><div className="exam-progress"><div><span>Question {index + 1} of {exam.questions.length}</span><b>{Math.round(answered / exam.questions.length * 100)}% answered</b></div><i><span style={{ width: `${answered / exam.questions.length * 100}%` }} /></i></div><div className="exam-tools"><span className="timer"><Icon name="clock" /> {formatTime(seconds)}</span><button className="secondary-button palette-button" onClick={() => setPalette(!palette)}>Palette</button><button className="primary-button compact" onClick={submit}>Submit test</button></div></header><div className="exam-body"><aside className={`question-palette ${palette ? "show" : ""}`}><div className="palette-head"><div><span className="overline">NAVIGATOR</span><h3>Question palette</h3></div><button className="icon-button palette-close" onClick={() => setPalette(false)}><Icon name="close" /></button></div><div className="palette-grid">{exam.questions.map((item, i) => <button key={item.id} onClick={() => { setIndex(i); setPalette(false); }} className={`${i === index ? "current" : ""} ${answers[item.id] ? "answered" : ""} ${flags.includes(item.id) ? "flagged" : ""}`}>{i + 1}</button>)}</div><div className="palette-legend"><span><i className="answered" />Answered</span><span><i className="current" />Current</span><span><i className="flagged" />Flagged</span></div><div className="attempt-card"><span>{answered}/{exam.questions.length}</span><p><b>Questions answered</b>{exam.questions.length - answered} still open</p></div></aside><main className="question-stage"><div className="question-meta"><div><span className="subject-tag">{question.subject}</span><span>{question.setting}</span><span>{question.difficulty}</span></div><button className={flags.includes(question.id) ? "flag-button active" : "flag-button"} onClick={toggleFlag}><Icon name="flag" size={16} />{flags.includes(question.id) ? "Flagged" : "Flag for review"}</button></div><div className="question-number">QUESTION {String(index + 1).padStart(2, "0")}</div><h2 className="question-stem">{question.stem}</h2><div className="options-list">{question.options.map((option) => <button className={answers[question.id] === option.id ? "selected" : ""} onClick={() => choose(option.id)} key={option.id}><span>{option.id}</span><p>{option.text}</p><i><Icon name="check" size={14} /></i></button>)}</div><div className="question-footer"><button className="secondary-button" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Previous</button><span>Choose the single best answer</span>{index === exam.questions.length - 1 ? <button className="primary-button" onClick={submit}>Finish & submit</button> : <button className="primary-button" onClick={() => setIndex(index + 1)}>Next question <Icon name="arrow" size={15} /></button>}</div></main></div></div>;
}

function Results({ exam, onExit, onLibrary }) {
  const [filter, setFilter] = useState("all"); const [open, setOpen] = useState(exam.questions[0]?.id);
  const result = exam.result; const shown = exam.questions.filter((q) => filter === "all" || (filter === "incorrect" && exam.answers[q.id] && exam.answers[q.id] !== q.correctOptionId) || (filter === "flagged" && exam.flags?.includes(q.id)));
  const circumference = 2 * Math.PI * 50;
  return <section className="results-page"><div className="result-hero"><div><span className="overline light-overline">TEST COMPLETE · {formatDate(exam.completedAt)}</span><h1>{result.percentage >= 70 ? "Sharp clinical thinking." : result.percentage >= 50 ? "A strong diagnostic baseline." : "Now the useful part begins."}</h1><p>{exam.title} · {exam.questions.length} questions · {formatTime(exam.elapsedSeconds)}</p><div className="result-actions"><button className="light-button" onClick={() => document.getElementById("review")?.scrollIntoView({ behavior: "smooth" })}>Review reasoning <Icon name="arrow" /></button><button className="text-button light" onClick={onExit}>Back to dashboard</button></div></div><div className="score-orbit"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" /><circle className="score-line" cx="60" cy="60" r="50" style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - result.percentage / 100) }} /></svg><div><strong>{result.percentage}<small>%</small></strong><span>weighted score</span></div></div></div><div className="result-metrics"><div><span className="result-dot correct" /><p><b>{result.correct}</b>Correct</p><small>+{result.correct * 4} marks</small></div><div><span className="result-dot wrong" /><p><b>{result.incorrect}</b>Incorrect</p><small>−{result.incorrect} marks</small></div><div><span className="result-dot blank" /><p><b>{result.unanswered}</b>Unanswered</p><small>0 marks</small></div><div className="net-score"><span>NET SCORE</span><strong>{result.score}<small> / {result.maxScore}</small></strong></div></div><div className="review-head" id="review"><div><span className="overline">DEEP REVIEW</span><h2>Turn errors into <em>retrieval cues.</em></h2></div><div className="segmented small">{[["all", `All ${exam.questions.length}`], ["incorrect", `Incorrect ${result.incorrect}`], ["flagged", `Flagged ${exam.flags?.length || 0}`]].map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}</div></div><div className="review-list">{shown.map((question) => {
    const answer = exam.answers[question.id]; const isCorrect = answer === question.correctOptionId; const isOpen = open === question.id;
    return <article className={`review-card ${isCorrect ? "correct" : "wrong"}`} key={question.id}><button className="review-summary" onClick={() => setOpen(isOpen ? null : question.id)}><span className="review-index">{String(question.number).padStart(2, "0")}</span><span className={`review-status ${isCorrect ? "correct" : answer ? "wrong" : "blank"}`}><Icon name={isCorrect ? "check" : "close"} size={14} /></span><span className="review-title"><small>{question.subject} · {question.sourceTags.slice(0, 2).join(" · ")}</small><b>{question.stem}</b></span><span className="your-answer"><small>Your answer</small><b>{answer || "—"} {isCorrect ? "Correct" : answer ? "Incorrect" : "Unanswered"}</b></span><span className={`chevron ${isOpen ? "open" : ""}`}>⌄</span></button>{isOpen && <div className="review-detail"><div className="review-options">{question.options.map((option) => { const chosen = answer === option.id; const right = question.correctOptionId === option.id; const wrongReason = question.whyOthersWrong.find((item) => item.optionId === option.id); return <div className={`${right ? "right" : ""} ${chosen && !right ? "chosen-wrong" : ""}`} key={option.id}><span>{option.id}</span><p><b>{option.text}</b>{right ? question.explanation : wrongReason?.reason}</p>{right && <i>BEST ANSWER</i>}{chosen && !right && <i>YOUR CHOICE</i>}</div>; })}</div><div className="learning-grid"><div className="learn-card trap"><span>⚠</span><p><b>The trap</b>{question.trap}</p></div><div className="learn-card clue"><span>⌁</span><p><b>Decisive clue</b>{question.clue}</p></div><div className="learn-card memory"><span>✦</span><p><b>Memory hook</b>{question.memoryTip}</p></div></div></div>}</article>;
  })}</div>{!shown.length && <div className="empty-state"><span><Icon name="check" size={30} /></span><h3>Nothing to review here</h3><p>Try another review filter.</p></div>}<div className="results-foot"><button className="secondary-button" onClick={onLibrary}>Open test library</button><button className="primary-button" onClick={onExit}>Finish review</button></div></section>;
}

function ResearchLab({ research, onResearch, onNeedKey, onGenerate }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function refresh() { setBusy(true); setError(""); try { const key = loadSessionKey(); const response = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json", ...(key ? { "x-openai-key": key } : {}) }, body: "{}" }); const data = await response.json(); if (!response.ok) { const err = new Error(data.error); err.status = response.status; throw err; } onResearch(data.research); } catch (err) { setError(err.message); if (err.status === 401) onNeedKey(); } finally { setBusy(false); } }
  return <section><div className="page-title"><div><span className="overline">TREND INTELLIGENCE</span><h1>Research before <em>recall.</em></h1><p>Convert current exam signals into a grounded topic map—not copied questions.</p></div><button className="primary-button" disabled={busy} onClick={refresh}>{busy ? <><span className="spinner" /> Researching…</> : <><Icon name="radar" /> {research ? "Refresh brief" : "Run deep research"}</>}</button></div>{error && <div className="error-banner">{error}</div>}{research ? <><div className="research-hero panel"><div className="signal-icon large"><Icon name="radar" size={30} /></div><div><span className="overline">LATEST BRIEF · {formatDate(research.generatedAt)}</span><h2>{research.headline}</h2><p>{research.summary}</p></div><button className="secondary-button" onClick={onGenerate}>Use in generator <Icon name="arrow" size={14} /></button></div><div className="research-grid"><div className="panel"><div className="panel-head"><div><span className="overline">PATTERN SIGNALS</span><h3>What the paper is testing</h3></div></div><ol className="signal-list">{research.examSignals.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol></div><div className="panel"><div className="panel-head"><div><span className="overline">GUIDELINE WATCH</span><h3>Volatile clinical areas</h3></div></div><div className="watch-list">{research.guidelineWatch.map((item) => <p key={item}><span>!</span>{item}</p>)}</div></div></div><div className="panel topic-panel"><div className="panel-head"><div><span className="overline">PRIORITY MAP</span><h3>High-yield topic queue</h3></div><span className="tiny-badge">{research.highYieldTopics.length} signals</span></div><div className="topic-table"><div className="table-head"><span>Topic</span><span>Subject</span><span>Priority</span><span>Why now</span></div>{research.highYieldTopics.map((item) => <div className="topic-row" key={`${item.subject}-${item.topic}`}><b>{item.topic}</b><span>{item.subject}</span><i className={item.priority === "Very high" ? "very-high" : ""}>{item.priority}</i><p>{item.rationale}</p></div>)}</div></div><div className="source-panel"><span className="overline">SOURCES CONSULTED</span><div>{research.sources?.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title} ↗</a>)}</div><p>Trend claims are directional signals, not official weightage. Clinical content should be checked against current authoritative guidance.</p></div></> : <div className="research-empty"><div className="research-rings"><span><Icon name="radar" size={38} /></span></div><span className="overline">NO BRIEF YET</span><h2>Give the generator a current map.</h2><p>The research pass searches exam-body information, educator trend discussions and authoritative guideline sources, then saves a cited brief for 24 hours.</p><button className="primary-button" onClick={refresh}><Icon name="spark" /> Start deep research</button></div>}</section>;
}

function SettingsModal({ onClose, onSaved }) {
  const [key, setKey] = useState(loadSessionKey()); const [show, setShow] = useState(false); const [health, setHealth] = useState(null);
  useEffect(() => { fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {}); }, []);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-head"><div><span className="overline">CONNECTION</span><h2>OpenAI settings</h2></div><button className="icon-button" onClick={onClose}><Icon name="close" /></button></div><div className="key-illustration"><span><Icon name="key" size={25} /></span><div><b>Your key stays session-only</b><p>A key entered here is held in this browser tab and sent only to this app’s server routes. It is never written to localStorage or included in generated test records.</p></div></div><label className="field-label" htmlFor="api-key">OpenAI API key</label><div className="key-input"><input id="api-key" type={show ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" /><button onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div><p className="field-help">Leave blank to use the server’s <code>OPENAI_API_KEY</code>. For deployed multi-user apps, server-side keys are recommended.</p><div className="connection-status"><span className={health?.openaiConfigured ? "online" : ""}><i /> Server key {health?.openaiConfigured ? "configured" : "not configured"}</span><span className={health?.supabaseConfigured ? "online" : ""}><i /> Storage: {health?.supabaseConfigured ? "Supabase" : "private device"}</span></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => { saveSessionKey(key); onSaved(); }}>Save session settings</button></div></div></div>;
}
