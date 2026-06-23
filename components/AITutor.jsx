"use client";

import { useEffect, useRef, useState } from "react";
import { clearTutorSession, loadSessionKey, loadTutorSession, saveTutorSession } from "@/lib/client-store";

const STARTERS = [
  "Explain the difference between next best step and definitive management in NEET PG style.",
  "Why is this option a trap? Show me the hinge in simple language.",
  "Teach me ABG interpretation for exam questions with one memory trick.",
  "Summarize this topic once in plain language and once in exam language."
];

function MessageBubble({ item }) {
  return (
    <article className={`tutor-bubble ${item.role}`}>
      <span className="tutor-role">{item.role === "user" ? "You" : "PulseTest-AI Tutor"}</span>
      <p>{item.content}</p>
      {item.sources?.length > 0 && (
        <div className="tutor-sources">
          <span>World search</span>
          {item.sources.slice(0, 4).map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title} ↗</a>)}
        </div>
      )}
    </article>
  );
}

export default function AITutor({ draft, onDraftConsumed, onNeedKey }) {
  const [session, setSession] = useState(() => loadTutorSession());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const transcriptRef = useRef(null);

  useEffect(() => {
    saveTutorSession(session);
  }, [session]);

  useEffect(() => {
    if (!draft?.id || !draft?.text) return;
    const frame = requestAnimationFrame(() => {
      setInput(draft.text);
      onDraftConsumed?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [draft, onDraftConsumed]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages, busy]);

  async function sendMessage(messageText = input) {
    const message = messageText.trim();
    if (!message || busy) return;
    const userEntry = { id: crypto.randomUUID(), role: "user", content: message };
    setBusy(true);
    setError("");
    setInput("");
    setSession((current) => ({ ...current, messages: [...current.messages, userEntry].slice(-20) }));
    try {
      const key = loadSessionKey();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(key ? { "x-openai-key": key } : {}) },
        body: JSON.stringify({
          message,
          previousResponseId: session.previousResponseId,
          useWorldSearch: session.useWorldSearch
        })
      });
      const data = await response.json();
      if (!response.ok) {
        const problem = new Error(data.error || "Could not get a tutor reply.");
        problem.status = response.status;
        throw problem;
      }
      const assistantEntry = { id: crypto.randomUUID(), role: "assistant", content: data.answer, sources: data.sources || [] };
      setSession((current) => ({
        ...current,
        previousResponseId: data.responseId,
        messages: [...current.messages, assistantEntry].slice(-20)
      }));
    } catch (problem) {
      setError(problem.message);
      setInput(message);
      setSession((current) => ({ ...current, messages: current.messages.filter((item) => item.id !== userEntry.id) }));
      if (problem.status === 401) onNeedKey?.();
    } finally {
      setBusy(false);
    }
  }

  function resetSession() {
    clearTutorSession();
    setSession({ previousResponseId: "", messages: [], useWorldSearch: false });
    setInput("");
    setError("");
  }

  return (
    <section className="tutor-page">
      <div className="page-title">
        <div>
          <span className="overline">AI TUTOR</span>
          <h1>Ask for a clearer <em>clinical explanation.</em></h1>
          <p>Stay inside PulseTest-AI when a trap, clue, or full concept needs a second explanation.</p>
        </div>
        <button className="secondary-button" onClick={resetSession}>Reset chat</button>
      </div>

      <div className="tutor-layout">
        <div className="panel tutor-panel">
          <div className="tutor-toolbar">
            <label className="research-toggle tutor-toggle">
              <span className={`toggle ${session.useWorldSearch ? "on" : ""}`} onClick={() => setSession((current) => ({ ...current, useWorldSearch: !current.useWorldSearch }))}><i /></span>
              <span>
                <b>Use world search when needed</b>
                <small>Slower, but helpful for current facts, world events, and fresh guidelines.</small>
              </span>
            </label>
          </div>

          <div className="tutor-transcript" ref={transcriptRef}>
            {session.messages.length ? session.messages.map((item) => <MessageBubble key={item.id} item={item} />) : (
              <div className="tutor-empty">
                <span>⌁</span>
                <h3>Ask the same tutor, not a new browser tab</h3>
                <p>Use it for simpler explanations, trap decoding, memory hooks, or current world context when you enable search.</p>
                <div className="tutor-starters">
                  {STARTERS.map((starter) => <button key={starter} onClick={() => sendMessage(starter)}>{starter}</button>)}
                </div>
              </div>
            )}
          </div>

          <div className="tutor-composer">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste a PulseTest-AI question, ask why the wrong option is tempting, or ask for a simpler explanation…"
              maxLength={2000}
            />
            <div className="tutor-actions">
              <small>{session.useWorldSearch ? "World search enabled" : "Fast local explanation mode"}</small>
              <button className="primary-button" disabled={busy || !input.trim()} onClick={() => sendMessage()}>{busy ? "Thinking…" : "Ask tutor"}</button>
            </div>
          </div>
          {error && <div className="error-banner">{error}</div>}
        </div>

        <aside className="tutor-side">
          <div className="preview-card">
            <span className="overline">BEST USES</span>
            <h3>When this tutor helps most</h3>
            <dl className="tutor-checklist">
              <div><dt>Trap decode</dt><dd>Why the tempting option looks correct at first glance.</dd></div>
              <div><dt>Simple language</dt><dd>One plain-language pass before the exam-language pass.</dd></div>
              <div><dt>Revision bridge</dt><dd>Turn one missed MCQ into a durable concept summary.</dd></div>
              <div><dt>Current facts</dt><dd>Enable world search only when freshness actually matters.</dd></div>
            </dl>
          </div>

          <div className="allocation-card">
            <span className="overline">PROMPT IDEAS</span>
            <div className="tutor-prompt-list">
              {[
                "Explain this as if I only know the basics.",
                "What clue in the stem changes the answer?",
                "Which option is the nearest distractor and why?",
                "Give me one memory hook and one exam trap."
              ].map((idea) => <button key={idea} className="text-button" onClick={() => setInput(idea)}>{idea}</button>)}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
