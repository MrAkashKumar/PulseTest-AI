export const SUBJECT_WEIGHTS = {
  Medicine: 60,
  OBGY: 25,
  Surgery: 20,
  Pathology: 15,
  Pharmacology: 15,
  Microbiology: 10,
  PSM: 10,
  "Integrated subjects": 25
};

export const SUBJECTS = Object.keys(SUBJECT_WEIGHTS);

export const SETTINGS = ["Emergency", "ICU", "OPD", "Ward", "Labor room", "OT", "Postoperative"];

export function allocateSubjects(total, selected = SUBJECTS) {
  const active = selected.length ? selected : SUBJECTS;
  const denominator = active.reduce((sum, subject) => sum + SUBJECT_WEIGHTS[subject], 0);
  const raw = active.map((subject) => ({
    subject,
    exact: (SUBJECT_WEIGHTS[subject] / denominator) * total
  }));
  const counts = raw.map((item) => ({ subject: item.subject, count: Math.floor(item.exact), fraction: item.exact % 1 }));
  let left = total - counts.reduce((sum, item) => sum + item.count, 0);
  counts.sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < left; index += 1) counts[index % counts.length].count += 1;
  return counts.filter((item) => item.count > 0).map(({ subject, count }) => ({ subject, count }));
}

export function buildBatchPlan(total, selectedSubjects, size = 10) {
  const pool = allocateSubjects(total, selectedSubjects).flatMap(({ subject, count }) => Array(count).fill(subject));
  const interleaved = [];
  while (pool.length) {
    const seen = new Set();
    for (let i = 0; i < pool.length && interleaved.length < total; ) {
      if (!seen.has(pool[i])) {
        seen.add(pool[i]);
        interleaved.push(pool.splice(i, 1)[0]);
      } else i += 1;
    }
  }
  const batches = [];
  for (let i = 0; i < interleaved.length; i += size) {
    const slice = interleaved.slice(i, i + size);
    const subjects = Object.entries(slice.reduce((acc, subject) => ({ ...acc, [subject]: (acc[subject] || 0) + 1 }), {}))
      .map(([subject, count]) => ({ subject, count }));
    batches.push({ startNumber: i + 1, count: slice.length, subjects });
  }
  return batches;
}
