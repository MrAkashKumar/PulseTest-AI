"use client";

import { analyzePerformance, buildStudyPath } from "@/lib/analytics";

function LineChart({ values }) {
  const data = values.slice(-14);
  if (!data.length) return <div className="chart-empty">Complete a test to draw your first trend line.</div>;
  const width = 680; const height = 190; const pad = 24;
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : pad + index * ((width - pad * 2) / (data.length - 1));
    const y = height - pad - (item.percentage / 100) * (height - pad * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${path} L${points.at(-1).x},${height - pad} L${points[0].x},${height - pad} Z`;
  return <svg className="progress-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Score progression chart">
    {[25, 50, 75, 100].map((mark) => <g key={mark}><line x1={pad} x2={width - pad} y1={height - pad - mark / 100 * (height - pad * 2)} y2={height - pad - mark / 100 * (height - pad * 2)} /><text x="0" y={height - pad - mark / 100 * (height - pad * 2) + 3}>{mark}</text></g>)}
    <path className="chart-area" d={area} /><path className="chart-path" d={path} />
    {points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="4"><title>{point.date}: {point.percentage}%</title></circle>)}
  </svg>;
}

export default function ProgressLab({ exams, onGenerate }) {
  const analysis = analyzePerformance(exams); const path = buildStudyPath(analysis);
  const weakName = analysis.weaknesses[0]?.subject || "Not measured"; const strongName = analysis.strengths[0]?.subject || "Building baseline";
  return <section className="progress-page">
    <div className="page-title"><div><span className="overline">PERFORMANCE OS</span><h1>Your preparation, <em>made visible.</em></h1><p>Day-by-day movement, subject gaps and the shortest path to your next level.</p></div><button className="primary-button" onClick={onGenerate}>Start adaptive test <span>→</span></button></div>
    <div className="readiness-hero">
      <div className="readiness-score"><span>READINESS</span><strong>{analysis.readiness}<small>%</small></strong><i><b style={{ width: `${analysis.readiness}%` }} /></i><p>{analysis.completed.length ? `${analysis.trend >= 0 ? "+" : ""}${analysis.trend}% over your previous test window` : "Complete two tests to establish a trend"}</p></div>
      <div className="projected-card"><span>PROJECTED GRAND TEST</span><strong>{analysis.projectedCorrect180}<small>/180 correct</small></strong><p>Estimated from {analysis.totalQuestions || 0} attempted practice questions—not a rank prediction.</p></div>
      <div className="signal-pair"><div><span>STRONGEST</span><b>{strongName}</b><small>{analysis.strengths[0]?.accuracy || 0}% accuracy</small></div><div><span>REPAIR FIRST</span><b>{weakName}</b><small>{analysis.weaknesses[0]?.accuracy || 0}% accuracy</small></div></div>
    </div>
    <div className="progress-layout">
      <div className="panel trend-panel"><div className="panel-head"><div><span className="overline">DAILY PROGRESSION</span><h3>Weighted score movement</h3></div><span className={`trend-badge ${analysis.trend < 0 ? "down" : ""}`}>{analysis.trend >= 0 ? "↗" : "↘"} {Math.abs(analysis.trend)}%</span></div><LineChart values={analysis.daily} /><div className="chart-foot"><span>Older</span><b>Target zone ≥ 70%</b><span>Today</span></div></div>
      <div className="panel snapshot-panel"><div className="panel-head"><div><span className="overline">SNAPSHOT</span><h3>Practice volume</h3></div></div><div className="snapshot-ring" style={{ "--score": `${analysis.overallAccuracy * 3.6}deg` }}><div><strong>{analysis.overallAccuracy}%</strong><span>accuracy</span></div></div><dl><div><dt>Tests complete</dt><dd>{analysis.completed.length}</dd></div><div><dt>Questions seen</dt><dd>{analysis.totalQuestions}</dd></div><div><dt>Study days</dt><dd>{analysis.daily.length}</dd></div></dl></div>
    </div>
    <div className="panel mastery-panel"><div className="panel-head"><div><span className="overline">SUBJECT MASTERY</span><h3>Where marks are being won—and quietly lost</h3></div><span className="tiny-badge">Based on attempted questions</span></div>{analysis.subjects.length ? <div className="mastery-list">{analysis.subjects.map((item) => <div className="mastery-row" key={item.subject}><span><b>{item.subject}</b><small>{item.correct}/{item.attempted} correct · {item.weakTags.join(", ") || "no repeated trap yet"}</small></span><i><b className={item.accuracy < 55 ? "weak" : item.accuracy >= 75 ? "strong" : ""} style={{ width: `${item.accuracy}%` }} /></i><strong>{item.accuracy}%</strong></div>)}</div> : <div className="chart-empty">Subject mastery appears after your first submitted paper.</div>}</div>
    <div className="pathway-section"><div className="pathway-title"><span className="overline">YOUR NEXT 7 DAYS</span><h2>A pathway, not a guilt trip.</h2><p>PulseTest-AI updates this sequence after every submission.</p></div><div className="pathway-grid">{path.map((item) => <article className={`path-card ${item.tone}`} key={item.step}><span>0{item.step}</span><div><b>{item.title}</b><p>{item.detail}</p></div></article>)}</div></div>
  </section>;
}
