# PulseTest-AI

PulseTest-AI is a deployable NEET PG / INI-CET clinical reasoning workspace. It generates original single-best-answer papers, hides the answer key until submission, scores with `+4 / -1`, and turns every option into a post-test teaching moment.

## What is included

- Custom tests from 5 to 180 questions, generated in resilient 10-question batches
- The requested 180-question subject blueprint (60 Medicine, 25 OBGY, 20 Surgery, 15 Pathology, 15 Pharmacology, 10 Microbiology, 10 PSM, 25 integrated)
- OpenAI Responses API with strict structured outputs
- Optional web-grounded daily trend research with visible source links
- Question palette, timer, flags, autosave, negative marking, score dashboard
- Correct/incorrect option analysis, trap, decisive clue, and memory hook
- Private local browser storage by default; optional Supabase JSONB sync
- Session-only bring-your-own API key, plus recommended server-side key support
- A complete five-question demo requiring no API key
- LeetCode-style daily clinical case and one-click concept-sibling generation
- India-focused Deep Search with visible sources, a 20-year pattern lens, confidence-labelled 10-year forecasts, and an emerging-disease watch
- Adaptive difficulty and subject allocation derived from the candidate’s own answers
- Day-by-day score charts, subject mastery bars, strong/weak areas, projected correct answers out of 180, and a seven-day repair pathway
- Local daily API-cost ceilings for generated questions and Deep Search calls

## Local setup

Use Node.js 24 LTS or newer.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. Either put `OPENAI_API_KEY` in `.env.local`, or open Settings in the app and use a session-only key. The browser key is never persisted to localStorage.

`OPENAI_MODEL` defaults to `gpt-5.5`. Use a model that supports Responses API structured outputs and web search. Web research has an additional tool cost.

Deep Search uses OpenAI’s Responses API web-search tool with an India location hint. A separate Google API key is not required. The related-question endpoint restricts medical grounding to an authoritative-domain allowlist including WHO, NBEMS, AIIMS, ICMR, NCDC/MoHFW, NMC, national programmes, PubMed and ClinicalTrials.gov.

## Prediction methodology

PulseTest-AI does **not** claim to know future or leaked questions. The research brief explicitly separates:

- **Official** — exam-body rules, notices and archives.
- **Recall signal** — repeated but non-official candidate or educator reports.
- **Inference** — AI synthesis from curriculum, exam-format and health-system signals.

The “20-year lens” can include the AIPGMEE/AIIMS era, NEET-PG from its 2012 launch and the later INI-CET era where evidence is available. Complete recent official papers are generally unavailable, so the app forecasts topic families and reasoning formats with Low/Medium/High confidence instead of pretending to predict exact questions.

## Question quality and non-bias contract

- Official NBEMS/NBE and AIIMS examination sources are the only authority for exam format, marking, dates, notices and paper rules.
- Coaching discussions and recalls may suggest a topic pattern but never determine a medical answer or official weightage.
- Each generated question includes hidden `evidenceLevel`, `timeSensitivity` and `answerCheck` metadata. The server also rejects duplicate options, invalid keys, inconsistent distractor analysis, incomplete scenarios and insufficient explanations.
- When credible current guidance conflicts or two options remain defensible, the model is instructed to discard that candidate and generate a replacement. It must never knowingly guess a key.
- Emerging-disease scenarios must come from verified surveillance or authoritative guidance and test stable patient-facing decisions. Recency alone cannot inflate weightage.
- The prompt prohibits demographic and geographic stereotypes. Candidate adaptation changes practice allocation and difficulty—not scientific truth, answer keys or scoring.

## Adaptive loop

After every submitted paper, `lib/analytics.js` recalculates subject accuracy, repeated missed tags, recent score movement, projected correct answers out of 180 and a readiness indicator. The next adaptive paper uses that compact profile to allocate approximately 60% to weak areas, 25% to spaced retrieval of previous errors and 15% to stronger areas at a higher challenge level. Raw personal medical data is neither requested nor used.

## Supabase (optional)

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Enable **Anonymous Sign-Ins** under Authentication → Providers.
4. Add the Supabase URL and anon key to `.env.local`.
5. Add the service-role key only to the server environment if daily research snapshots should be saved.

The included row-level security policy binds each record to its authenticated anonymous user. Add a durable login before promising multi-device sync; generated educational content should never be used to store patient information.

## Deploy to Vercel

1. Import the repository into Vercel.
2. Add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `CRON_SECRET`.
3. Optionally add the three Supabase variables from `.env.example`.
4. Deploy. `vercel.json` schedules one daily research refresh at 06:00 IST.

If your Vercel plan has a shorter function limit, keep the browser-driven research refresh and remove the cron; question generation already uses one request per 10-question batch.

## Data model and safety

Only generated paper content, answers, attempt state, and research briefs are stored. No patient data is requested. This is an educational product—not a clinical decision-support tool—and guideline-sensitive explanations should be verified against current authoritative sources.

## Project structure

```text
app/api/generate          batched structured question generation
app/api/related           web-grounded conceptual sibling question
app/api/research          historical, forecast and disease intelligence
app/api/cron              protected daily research refresh
components                dashboard, exam, report card and analytics UI
lib/analytics.js          adaptive learner model and study pathway
lib/prompts.js            paper-setter, research and sibling prompts
lib/question-schema.js    strict OpenAI response contracts
lib/client-store.js       local-first persistence, limits and Supabase sync
supabase/schema.sql       authenticated JSONB storage with RLS
```
