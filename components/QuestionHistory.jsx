"use client";

import { useMemo, useState } from "react";
import { summarizeQuestionArchive } from "@/lib/question-history";

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function subjectMixLabel(mix = []) {
  return mix.slice(0, 4).map((item) => `${item.subject} ${item.count}`).join(" · ");
}

function shortLabel(value = "", max = 34) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function statusMeta(status) {
  const map = {
    correct: { label: "Answered correctly", tone: "correct" },
    wrong: { label: "Answered wrong", tone: "wrong" },
    unanswered: { label: "Unanswered after submission", tone: "blank" },
    "in-progress": { label: "Answered in active paper", tone: "progress" },
    generated: { label: "Generated only", tone: "generated" }
  };
  return map[status] || { label: "Generated", tone: "generated" };
}

function tutorPromptFromArchive(record) {
  const correctOption = record.options.find((option) => option.id === record.correctOptionId);
  const selectedOption = record.options.find((option) => option.id === record.candidateAnswer);
  return `Explain this NEET PG question in a clear, exam-focused way.\n\nQuestion: ${record.stem}\n\nOptions:\n${record.options.map((option) => `${option.id}. ${option.text}`).join("\n")}\n\nCorrect answer: ${record.correctOptionId}. ${correctOption?.text || ""}\nMy answer: ${record.candidateAnswer ? `${record.candidateAnswer}. ${selectedOption?.text || ""}` : "Not answered"}\nTrap: ${record.trap}\nDecisive clue: ${record.clue}\nAnswer audit: ${record.answerCheck || "Not available"}\n\nPlease explain the hinge, the nearest distractor and one memory hook.`;
}

export default function QuestionHistory({ records, exams, onGenerate, onOpenExam, onTutor }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("");
  const [open, setOpen] = useState(records[0]?.archiveId || null);

  const summary = useMemo(() => summarizeQuestionArchive(records), [records]);
  const subjectOptions = useMemo(() => summary.subjects.map((item) => item.label), [summary]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return records.filter((record) => {
      if (subject !== "all" && record.subject !== subject) return false;
      if (status !== "all" && record.answerStatus !== status) return false;
      if (tag && !(record.sourceTags || []).includes(tag)) return false;
      if (!term) return true;
      return `${record.examTitle} ${record.subject} ${record.stem} ${(record.sourceTags || []).join(" ")} ${(record.integratedSubjects || []).join(" ")}`
        .toLowerCase()
        .includes(term);
    });
  }, [query, records, status, subject, tag]);

  const examById = useMemo(() => new Map(exams.map((exam) => [exam.id, exam])), [exams]);
  const topTopic = summary.topics[0]?.label || "—";

  return (
    <section className="question-history-page">
      <div className="page-title">
        <div>
          <span className="overline">QUESTION HISTORY</span>
          <h1>Your generated question <em>bank.</em></h1>
          <p>Every generated NEET PG-style question, with answer key, trap logic, paper flow and subject-mix context.</p>
        </div>
        <button className="primary-button" onClick={onGenerate}>Generate more questions <span>→</span></button>
      </div>

      <div className="history-summary-grid">
        <article className="history-stat-card">
          <span>QUESTIONS SAVED</span>
          <strong>{summary.totalQuestions}</strong>
          <small>Full stems, options and answer logic</small>
        </article>
        <article className="history-stat-card">
          <span>PAPERS TRACKED</span>
          <strong>{summary.totalPapers}</strong>
          <small>Flow preserved by paper and date</small>
        </article>
        <article className="history-stat-card">
          <span>SUBJECTS SEEN</span>
          <strong>{summary.subjects.length}</strong>
          <small>Observed generated mix across papers</small>
        </article>
        <article className="history-stat-card">
          <span>TOP RECURRING TOPIC</span>
          <strong>{shortLabel(topTopic, 28)}</strong>
          <small>Based on generated source tags</small>
        </article>
      </div>

      <div className="question-history-layout">
        <div className="panel history-main-panel">
          <div className="history-toolbar">
            <div className="history-search">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stem, topic, integrated subject or paper title…" aria-label="Search question history" />
            </div>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Filter by subject">
              <option value="all">All subjects</option>
              {subjectOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by answer status">
              <option value="all">All states</option>
              <option value="generated">Generated only</option>
              <option value="in-progress">In active paper</option>
              <option value="correct">Answered correctly</option>
              <option value="wrong">Answered wrong</option>
              <option value="unanswered">Unanswered</option>
            </select>
          </div>

          <div className="history-tag-row">
            <button className={!tag ? "active" : ""} onClick={() => setTag("")}>All topics</button>
            {summary.topics.slice(0, 10).map((item) => <button key={item.label} className={tag === item.label ? "active" : ""} onClick={() => setTag(item.label)}>{shortLabel(item.label)} <small>{item.count}</small></button>)}
          </div>

          <div className="history-list">
            {visible.length ? visible.map((record) => {
              const currentExam = examById.get(record.examId);
              const meta = statusMeta(record.answerStatus);
              const expanded = open === record.archiveId;
              return <article className={`archive-card ${meta.tone}`} key={record.archiveId}>
                <button className="archive-summary" onClick={() => setOpen(expanded ? null : record.archiveId)}>
                  <span className="archive-number">{record.number ? String(record.number).padStart(2, "0") : "—"}</span>
                  <span className={`archive-status ${meta.tone}`}>{meta.label}</span>
                  <span className="archive-title">
                    <small>{record.subject} · {record.setting || "Clinical"} · {record.difficulty}</small>
                    <b>{record.stem}</b>
                  </span>
                  <span className="archive-paper">
                    <small>{record.examTitle}</small>
                    <b>{formatDateTime(record.generatedAt)}</b>
                  </span>
                  <span className={`chevron ${expanded ? "open" : ""}`}>⌄</span>
                </button>

                {expanded && <div className="archive-detail">
                  <div className="archive-chip-block">
                    <span>Integrated: {(record.integratedSubjects || []).join(" · ") || "Single-subject dominant"}</span>
                    <span>Topics: {(record.sourceTags || []).join(" · ")}</span>
                    <span>Paper flow: Q{record.number || "—"} of {record.paperCount || "—"} · {record.paperMode || "Custom paper"}</span>
                  </div>

                  <div className="review-options">
                    {record.options.map((option) => {
                      const chosen = record.candidateAnswer === option.id;
                      const right = record.correctOptionId === option.id;
                      const wrongReason = record.whyOthersWrong.find((item) => item.optionId === option.id);
                      return <div className={`${right ? "right" : ""} ${chosen && !right ? "chosen-wrong" : ""}`} key={option.id}>
                        <span>{option.id}</span>
                        <p><b>{option.text}</b>{right ? record.explanation : wrongReason?.reason}</p>
                        {right && <i>BEST ANSWER</i>}
                        {chosen && !right && <i>YOUR CHOICE</i>}
                      </div>;
                    })}
                  </div>

                  <div className="learning-grid">
                    <div className="learn-card trap"><span>⚠</span><p><b>The trap</b>{record.trap}</p></div>
                    <div className="learn-card clue"><span>⌁</span><p><b>Decisive clue</b>{record.clue}</p></div>
                    <div className="learn-card memory"><span>✦</span><p><b>Memory hook</b>{record.memoryTip}</p></div>
                  </div>

                  {record.answerCheck && <div className="evidence-strip"><span>✓ ANSWER AUDITED</span><b>{record.evidenceLevel || "audited"}</b><p>{record.answerCheck}</p><i>{record.timeSensitivity || "Stable concept"}</i></div>}

                  <div className="archive-flow-grid">
                    <div className="archive-flow-card">
                      <span>PAPER SUBJECT MIX</span>
                      <p>{subjectMixLabel(record.paperSubjectMix) || "Mix not available yet"}</p>
                    </div>
                    <div className="archive-flow-card">
                      <span>GENERATOR SETTINGS</span>
                      <p>{record.paperDifficulty || "—"} · {record.usedResearch ? "Deep Search on" : "Deep Search off"} · {record.adaptiveMode ? "Adaptive on" : "Adaptive off"}</p>
                    </div>
                  </div>

                  <div className="review-support-actions">
                    {currentExam && <button className="secondary-button" onClick={() => onOpenExam(currentExam)}>{currentExam.status === "completed" ? "Open source review" : "Open source paper"}</button>}
                    <button className="secondary-button" onClick={() => onTutor?.(tutorPromptFromArchive(record))}>Ask AI tutor</button>
                  </div>
                </div>}
              </article>;
            }) : <div className="empty-state"><span>⌁</span><h3>No questions match this filter</h3><p>Try another subject, status, or topic tag.</p></div>}
          </div>
        </div>

        <aside className="history-side-stack">
          <div className="panel history-side-panel">
            <div className="panel-head">
              <div>
                <span className="overline">OBSERVED MIX</span>
                <h3>Subject distribution</h3>
              </div>
            </div>
            <div className="history-mix-list">
              {summary.subjects.slice(0, 8).map((item) => <div className="history-mix-row" key={item.label}><span>{item.label}</span><i><b style={{ width: `${item.count / Math.max(1, summary.subjects[0]?.count || 1) * 100}%` }} /></i><strong>{item.count}</strong></div>)}
            </div>
          </div>

          <div className="panel history-side-panel">
            <div className="panel-head">
              <div>
                <span className="overline">RECENT FLOW</span>
                <h3>How papers were mixed</h3>
              </div>
            </div>
            <div className="history-paper-flow">
              {summary.recentPapers.map((paper) => <article key={paper.examId}><span>{formatDateTime(paper.generatedAt)}</span><b>{paper.title}</b><p>{paper.count} questions · {subjectMixLabel(paper.mix)}</p></article>)}
            </div>
          </div>

          <div className="panel history-side-panel">
            <span className="overline">NEET PG STANDARD</span>
            <h3>What this history helps you audit</h3>
            <div className="history-standard-list">
              <div><b>Structure</b><p>Age, sex, setting, hinge clue and exam-useful distractors.</p></div>
              <div><b>Mix style</b><p>Which subjects and source tags are dominating your generated papers.</p></div>
              <div><b>Answer safety</b><p>Every archived item keeps its answer audit, trap and explanation.</p></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
