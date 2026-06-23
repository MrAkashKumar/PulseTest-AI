"use client";

import { useEffect, useMemo, useState } from "react";
import { adaptivePromptFromExams, analyzePerformance, buildStudyPath, examSubjectBreakdown } from "@/lib/analytics";
import { certificateForResult } from "@/lib/certification";
import { getPreferences, getTodayUsage, loadQuestionMemory, loadSessionKey, recordUsage } from "@/lib/client-store";

function formatTime(seconds = 0) {
  const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${rest}s`;
}

function Celebration({ percentage, certification }) {
  const message = percentage >= 80 ? "Consultant nod detected. Rare event." : percentage >= 55 ? "Not bad. Even the distractor looked nervous." : "Plot twist: the wrong answers just wrote your revision plan.";
  return <div className="micro-celebration" aria-live="polite"><div className="confetti-field">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--i": index }} />)}</div><span>✦</span><b>{certification.label} unlocked · {message}</b></div>;
}

function RelatedPractice({ sourceQuestion, selectedAnswer, research, exams, onNeedKey }) {
  const [question, setQuestion] = useState(null); const [sources, setSources] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [answer, setAnswer] = useState(""); const [checked, setChecked] = useState(false);
  async function generate() {
    const preferences = getPreferences(); const usage = getTodayUsage();
    if (usage.research >= preferences.dailyResearchLimit) { setError(`Today’s Deep Search limit is ${preferences.dailyResearchLimit}. Change it in Settings or continue tomorrow.`); return; }
    setBusy(true); setError(""); setChecked(false); setAnswer("");
    try {
      const key = loadSessionKey();
      const questionMemory = loadQuestionMemory();
      const response = await fetch("/api/related", { method: "POST", headers: { "Content-Type": "application/json", ...(key ? { "x-openai-key": key } : {}) }, body: JSON.stringify({
        sourceQuestion, selectedAnswer, adaptiveProfile: adaptivePromptFromExams(exams),
        researchBrief: research ? `${research.summary}\nDisease watch: ${(research.diseaseWatch || []).map((item) => `${item.disease}: ${item.signal}`).join("; ")}` : "",
        seenFingerprints: questionMemory.map((item) => item.fingerprint),
        seenNearFingerprints: questionMemory.map((item) => item.nearFingerprint)
      }) });
      const data = await response.json();
      if (!response.ok) { const problem = new Error(data.error || "Could not create a related question"); problem.status = response.status; throw problem; }
      setQuestion(data.question); setSources(data.sources || []); recordUsage("research", 1);
    } catch (problem) { setError(problem.message); if (problem.status === 401) onNeedKey(); }
    finally { setBusy(false); }
  }
  if (!question) return <div className="related-launch"><div><span>∞</span><p><b>Lock the concept with a sibling case</b>Deep Search verifies the current rule, then changes the patient, trap and decision hinge.</p></div><button className="secondary-button" onClick={generate} disabled={busy}>{busy ? <><span className="spinner dark" /> Researching…</> : "Generate related question →"}</button>{error && <p className="inline-error">{error}</p>}</div>;
  return <div className="related-practice"><div className="related-head"><div><span className="overline">CONCEPT SIBLING · DEEP SEARCHED</span><h4>{question.subject} · {question.difficulty}</h4></div><button className="text-button" onClick={generate} disabled={busy}>{busy ? "Regenerating…" : "New variation ↻"}</button></div><p className="related-stem">{question.stem}</p><div className="related-options">{question.options.map((option) => { const isRight = checked && option.id === question.correctOptionId; const isWrong = checked && answer === option.id && !isRight; return <button key={option.id} disabled={checked} onClick={() => setAnswer(option.id)} className={`${answer === option.id ? "selected" : ""} ${isRight ? "right" : ""} ${isWrong ? "wrong" : ""}`}><span>{option.id}</span>{option.text}</button>; })}</div>{!checked ? <button className="primary-button related-check" disabled={!answer} onClick={() => setChecked(true)}>Check reasoning</button> : <div className="related-explanation"><b>{answer === question.correctOptionId ? "Correct—the hinge transferred." : `Best answer: ${question.correctOptionId}`}</b><p>{question.explanation}</p><div><span>Trap</span>{question.trap}</div><div><span>Memory hook</span>{question.memoryTip}</div>{question.answerCheck && <div><span>Answer audit</span>{question.answerCheck}</div>}</div>}{sources.length > 0 && <div className="related-sources"><span>SEARCH SOURCES</span>{sources.slice(0, 5).map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title} ↗</a>)}</div>}{error && <p className="inline-error">{error}</p>}</div>;
}

function tutorPromptFromQuestion(question, answer) {
  const correctOption = question.options.find((option) => option.id === question.correctOptionId);
  const selectedOption = question.options.find((option) => option.id === answer);
  return `Explain this NEET PG question in simpler language.\n\nQuestion: ${question.stem}\n\nOptions:\n${question.options.map((option) => `${option.id}. ${option.text}`).join("\n")}\n\nCorrect answer: ${question.correctOptionId}. ${correctOption?.text || ""}\nMy answer: ${answer ? `${answer}. ${selectedOption?.text || ""}` : "Unanswered"}\nWhy this is a trap: ${question.trap}\nDecisive clue: ${question.clue}\nAnswer audit: ${question.answerCheck || "Not available"}\n\nPlease explain the hinge, the nearest distractor, and one memory hook.`;
}

export default function ResultsReport({ exam, exams, research, onExit, onLibrary, onProgress, onNeedKey, onTutor }) {
  const [filter, setFilter] = useState("all"); const [open, setOpen] = useState(exam.questions[0]?.id); const [celebrate, setCelebrate] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setCelebrate(false), 1450); return () => clearTimeout(timer); }, []);
  const result = exam.result; const subjects = useMemo(() => examSubjectBreakdown(exam), [exam]); const analysis = useMemo(() => analyzePerformance(exams), [exams]); const path = buildStudyPath(analysis);
  const certification = result.certification || certificateForResult(result, exam.questions.length);
  const projected180 = Math.min(180, Math.round(result.correct / exam.questions.length * 180));
  const shown = exam.questions.filter((question) => filter === "all" || (filter === "incorrect" && exam.answers[question.id] !== question.correctOptionId) || (filter === "flagged" && exam.flags?.includes(question.id)));
  return <section className="results-page report-v2">{celebrate && <Celebration percentage={result.percentage} certification={certification} />}
    <div className="report-hero"><div><span className="overline light-overline">REPORT CARD · ADAPTIVE PROFILE UPDATED</span><h1>{result.percentage >= 75 ? "Clinical instincts: switched on." : result.percentage >= 50 ? "Good baseline. Now sharpen the hinges." : "Excellent—your weak points stopped hiding."}</h1><p>{exam.title} · {exam.questions.length} questions · {formatTime(exam.elapsedSeconds)}</p><div className={`certificate-badge ${certification.tier}`}><span>{certification.label}</span><b>{certification.title}</b><small>{certification.solvedLabel} · {certification.message}</small></div><div className="result-actions"><button className="light-button" onClick={() => document.getElementById("deep-review")?.scrollIntoView({ behavior: "smooth" })}>Review every decision ↓</button><button className="text-button light" onClick={onProgress}>Open progression report</button></div></div><div className="report-score"><span>QUESTIONS CORRECT</span><strong>{result.correct}<small>/{exam.questions.length}</small></strong><i><b style={{ width: `${result.correct / exam.questions.length * 100}%` }} /></i><p>Projected equivalent <b>{projected180}/180</b></p></div></div>
    <div className="report-stat-row"><div><span>NEET MARKS</span><b>{result.score}<small>/{result.maxScore}</small></b></div><div><span>ACCURACY</span><b>{result.accuracy}%</b></div><div><span>INCORRECT</span><b className="red-number">{result.incorrect}</b></div><div><span>UNANSWERED</span><b>{result.unanswered}</b></div><div><span>PACE</span><b>{Math.round(exam.elapsedSeconds / Math.max(1, exam.questions.length))}<small>s/Q</small></b></div></div>
    <div className="post-test-grid"><div className="panel subject-report"><div className="panel-head"><div><span className="overline">SUBJECT X-RAY</span><h3>Marks by discipline</h3></div><span className="tiny-badge">This test</span></div>{subjects.map((item) => <div className="report-subject-row" key={item.subject}><span><b>{item.subject}</b><small>{item.correct}/{item.total}</small></span><i><b className={item.accuracy < 55 ? "weak" : item.accuracy >= 75 ? "strong" : ""} style={{ width: `${item.accuracy}%` }} /></i><strong>{item.accuracy}%</strong></div>)}</div><div className="panel next-move-card"><span className="overline">AI COACH · NEXT MOVE</span><h3>{path[0]?.title}</h3><p>{path[0]?.detail}</p><div className="coach-mini-path">{path.map((item) => <span key={item.step}><i>{item.step}</i>{item.title}</span>)}</div><button className="secondary-button" onClick={onProgress}>View full 7-day pathway →</button></div></div>
    <div className="review-head" id="deep-review"><div><span className="overline">LEETCODE-STYLE REVIEW</span><h2>One question. Three layers of <em>learning.</em></h2><p>Reasoning → trap → a fresh related case grounded with current sources.</p></div><div className="segmented small">{[["all", `All ${exam.questions.length}`], ["incorrect", `Needs work ${result.incorrect + result.unanswered}`], ["flagged", `Flagged ${exam.flags?.length || 0}`]].map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
    <div className="review-list">{shown.map((question) => { const answer = exam.answers[question.id]; const correct = answer === question.correctOptionId; const expanded = open === question.id; return <article className={`review-card ${correct ? "correct" : "wrong"}`} key={question.id}><button className="review-summary" onClick={() => setOpen(expanded ? null : question.id)}><span className="review-index">{String(question.number).padStart(2, "0")}</span><span className={`review-status ${correct ? "correct" : answer ? "wrong" : "blank"}`}>{correct ? "✓" : "×"}</span><span className="review-title"><small>{question.subject} · {question.sourceTags.slice(0, 2).join(" · ")}</small><b>{question.stem}</b></span><span className="your-answer"><small>Your answer</small><b>{answer || "—"} {correct ? "Correct" : answer ? "Incorrect" : "Unanswered"}</b></span><span className={`chevron ${expanded ? "open" : ""}`}>⌄</span></button>{expanded && <div className="review-detail"><div className="review-options">{question.options.map((option) => { const chosen = answer === option.id; const right = question.correctOptionId === option.id; const wrongReason = question.whyOthersWrong.find((item) => item.optionId === option.id); return <div className={`${right ? "right" : ""} ${chosen && !right ? "chosen-wrong" : ""}`} key={option.id}><span>{option.id}</span><p><b>{option.text}</b>{right ? question.explanation : wrongReason?.reason}</p>{right && <i>BEST ANSWER</i>}{chosen && !right && <i>YOUR CHOICE</i>}</div>; })}</div><div className="learning-grid"><div className="learn-card trap"><span>⚠</span><p><b>The trap</b>{question.trap}</p></div><div className="learn-card clue"><span>⌁</span><p><b>Decisive clue</b>{question.clue}</p></div><div className="learn-card memory"><span>✦</span><p><b>Memory hook</b>{question.memoryTip}</p></div></div>{question.answerCheck && <div className="evidence-strip"><span>✓ ANSWER AUDITED</span><b>{question.evidenceLevel}</b><p>{question.answerCheck}</p><i>{question.timeSensitivity}</i></div>}<div className="review-support-actions"><button className="secondary-button" onClick={() => onTutor?.(tutorPromptFromQuestion(question, answer))}>Ask AI tutor</button></div><RelatedPractice sourceQuestion={question} selectedAnswer={answer} research={research} exams={exams} onNeedKey={onNeedKey} /></div>}</article>; })}</div>
    {!shown.length && <div className="empty-state"><span>✓</span><h3>Nothing hiding here</h3><p>Choose another review filter.</p></div>}<div className="results-foot"><button className="secondary-button" onClick={onLibrary}>Test library</button><button className="secondary-button" onClick={onProgress}>Progress report</button><button className="primary-button" onClick={onExit}>Finish review</button></div>
  </section>;
}
