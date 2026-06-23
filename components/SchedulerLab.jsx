"use client";

import { useEffect, useMemo, useState } from "react";
import { SUBJECTS, allocateSubjects } from "@/lib/constants";

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDatetimeLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDuration(ms) {
  const total = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
}

function scheduleState(schedule, now) {
  if (schedule.status === "generating") return { label: "Generating", tone: "active" };
  if (schedule.status === "ready") return { label: "Ready", tone: "ready" };
  if (schedule.status === "failed") return { label: "Needs retry", tone: "failed" };
  if (now >= new Date(schedule.scheduledAt).getTime()) return { label: "Due now", tone: "active" };
  if (now >= new Date(schedule.prepStartsAt).getTime()) return { label: "Prep window", tone: "prep" };
  return { label: "Scheduled", tone: "scheduled" };
}

function prepLine(schedule) {
  const topics = schedule.customPrompt?.trim() || schedule.subjects.join(", ");
  return `Revise: ${topics.slice(0, 140)}${topics.length > 140 ? "..." : ""}`;
}

export default function SchedulerLab({ schedules, exams, onCreate, onCancel, onRunNow, onOpenExam }) {
  const [now, setNow] = useState(() => Date.now());
  const [count, setCount] = useState(20);
  const [difficulty, setDifficulty] = useState("Moderate to high");
  const [subjects, setSubjects] = useState(SUBJECTS);
  const [customPrompt, setCustomPrompt] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [useResearch, setUseResearch] = useState(true);
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const allocation = useMemo(() => allocateSubjects(count, subjects), [count, subjects]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function toggleSubject(subject) {
    setSubjects((current) => current.includes(subject) ? (current.length === 1 ? current : current.filter((item) => item !== subject)) : [...current, subject]);
  }

  function createSchedule() {
    const target = new Date(scheduledAt);
    if (Number.isNaN(target.getTime())) return;
    const prepStartsAt = new Date(target.getTime() - reminderMinutes * 60 * 1000);
    onCreate({
      id: crypto.randomUUID(),
      title: `${count}Q scheduled paper`,
      count,
      difficulty,
      subjects,
      customPrompt,
      useResearch,
      adaptiveMode,
      reminderMinutes,
      prepStartsAt: prepStartsAt.toISOString(),
      scheduledAt: target.toISOString(),
      status: "scheduled",
      createdAt: new Date().toISOString(),
      progress: { done: 0, total: count, label: "Waiting for schedule" }
    });
  }

  return <section className="scheduler-page">
    <div className="page-title">
      <div><span className="overline">SCHEDULER</span><h1>Let the paper arrive <em>before you sit.</em></h1><p>Schedule generation ahead of time, use the prep window, then open the ready test from your library.</p></div>
      <button className="primary-button" onClick={createSchedule}>Schedule paper</button>
    </div>

    <div className="scheduler-layout">
      <div className="panel scheduler-builder">
        <div className="schedule-form-grid">
          <label><span>Questions</span><input type="number" min="5" max="180" step="5" value={count} onChange={(event) => setCount(Math.min(180, Math.max(5, Number(event.target.value))))} /></label>
          <label><span>Generate at</span><input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
          <label><span>Prep starts</span><select value={reminderMinutes} onChange={(event) => setReminderMinutes(Number(event.target.value))}><option value="30">30 min before</option><option value="60">1 hour before</option><option value="120">2 hours before</option></select></label>
          <label><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Moderate</option><option>Moderate to high</option><option>Examiner mode</option></select></label>
        </div>

        <div className="scheduler-section">
          <span className="overline">SUBJECT MIX</span>
          <div className="subject-chips schedule-chips">{SUBJECTS.map((subject) => <button key={subject} onClick={() => toggleSubject(subject)} className={subjects.includes(subject) ? "active" : ""}>{subject}</button>)}</div>
        </div>

        <div className="scheduler-section">
          <label className="field-label" htmlFor="schedule-prompt">Prep focus</label>
          <textarea id="schedule-prompt" value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} placeholder="Example: Cardio-renal emergencies, ABG, shock, immediate-vs-definitive management traps..." maxLength={900} />
        </div>

        <div className="schedule-toggles">
          <button className={useResearch ? "active" : ""} onClick={() => setUseResearch(!useResearch)}>Deep Search {useResearch ? "on" : "off"}</button>
          <button className={adaptiveMode ? "active" : ""} onClick={() => setAdaptiveMode(!adaptiveMode)}>Adaptive {adaptiveMode ? "on" : "off"}</button>
        </div>
      </div>

      <aside className="scheduler-preview">
        <div className="preview-card">
          <span className="overline">READY PLAN</span>
          <h3>{count} questions</h3>
          <dl><div><dt>Generation</dt><dd>{formatDateTime(scheduledAt)}</dd></div><div><dt>Prep window</dt><dd>{reminderMinutes} min</dd></div><div><dt>Difficulty</dt><dd>{difficulty}</dd></div></dl>
        </div>
        <div className="allocation-card">
          <span className="overline">ALLOCATION</span>
          {allocation.map((item) => <div className="allocation-row" key={item.subject}><span>{item.subject}</span><i><b style={{ width: `${item.count / Math.max(...allocation.map((entry) => entry.count)) * 100}%` }} /></i><strong>{item.count}</strong></div>)}
        </div>
      </aside>
    </div>

    <div className="scheduled-list-head"><span className="overline">QUEUE</span><h2>Scheduled papers</h2></div>
    {schedules.length ? <div className="scheduled-grid">{schedules.map((schedule) => {
      const state = scheduleState(schedule, now);
      const exam = exams.find((item) => item.id === schedule.generatedExamId);
      const target = new Date(schedule.scheduledAt).getTime();
      const prep = new Date(schedule.prepStartsAt).getTime();
      const startedAt = new Date(schedule.generationStartedAt).getTime();
      const finishedAt = new Date(schedule.generationFinishedAt).getTime();
      const generationElapsed = schedule.status === "generating"
        ? now - startedAt
        : Number.isFinite(finishedAt) && Number.isFinite(startedAt) ? finishedAt - startedAt : 0;
      return <article className={`scheduled-card ${state.tone}`} key={schedule.id}>
        <div className="scheduled-card-head"><span>{state.label}</span><b>{schedule.count}Q</b></div>
        <h3>{schedule.title}</h3>
        <p>{prepLine(schedule)}</p>
        <dl>
          <div><dt>Prep starts</dt><dd>{formatDateTime(schedule.prepStartsAt)}</dd></div>
          <div><dt>Generates</dt><dd>{formatDateTime(schedule.scheduledAt)}</dd></div>
          <div><dt>{now < prep ? "Prep in" : now < target ? "Generate in" : schedule.status === "generating" ? "Generating for" : "Generation time"}</dt><dd>{schedule.status === "generating" ? formatDuration(generationElapsed) : now < target ? formatDuration((now < prep ? prep : target) - now) : generationElapsed ? formatDuration(generationElapsed) : "Ready to run"}</dd></div>
        </dl>
        {schedule.progress && schedule.status === "generating" && <div className="generation-progress schedule-progress"><div><span>{schedule.progress.label}</span><b>{schedule.progress.done}/{schedule.progress.total}</b></div><div className="progress-track"><i style={{ width: `${schedule.progress.total ? schedule.progress.done / schedule.progress.total * 100 : 4}%` }} /></div></div>}
        {schedule.error && <p className="inline-error">{schedule.error}</p>}
        <div className="scheduled-actions">
          {schedule.status === "ready" && exam ? <button className="primary-button" onClick={() => onOpenExam(exam)}>Open ready paper</button> : <button className="secondary-button" disabled={schedule.status === "generating"} onClick={() => onRunNow(schedule.id)}>Run now</button>}
          <button className="text-button" onClick={() => onCancel(schedule.id)}>Remove</button>
        </div>
      </article>;
    })}</div> : <div className="empty-state"><span>⌁</span><h3>No scheduled papers yet</h3><p>Create one paper schedule and let PulseTest-AI prepare it while you revise the selected topics.</p></div>}
  </section>;
}
