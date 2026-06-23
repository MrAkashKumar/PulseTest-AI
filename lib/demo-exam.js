import { buildTimingMeta } from "./exam-timing.js";

export const demoExam = {
  id: "demo-grand-round",
  title: "Grand Round · Demo",
  createdAt: "2026-06-22T00:00:00.000Z",
  status: "ready",
  config: { count: 5, difficulty: "Moderate to high", mode: "NEET PG + INI-CET", timing: buildTimingMeta(5) },
  questions: [
    {
      id: "demo-1", number: 1, subject: "Medicine", integratedSubjects: ["Cardiology", "Pharmacology"], setting: "Emergency", difficulty: "Hard",
      stem: "A 58-year-old man with diabetes presents 90 minutes after crushing retrosternal pain began. BP is 86/58 mmHg, pulse 48/min, JVP is elevated, and the lungs are clear. ECG shows ST elevation in leads II, III and aVF; lead III elevation exceeds lead II. After aspirin, the most appropriate immediate addition while arranging reperfusion is:",
      options: [{ id: "A", text: "Sublingual nitroglycerin" }, { id: "B", text: "A cautious IV crystalloid bolus" }, { id: "C", text: "IV furosemide" }, { id: "D", text: "Immediate metoprolol" }],
      correctOptionId: "B",
      explanation: "Inferior STEMI with hypotension, raised JVP and clear lungs strongly suggests right ventricular infarction. RV output is preload-dependent; a cautious fluid challenge supports LV filling while urgent reperfusion is arranged.",
      whyOthersWrong: [{ optionId: "A", reason: "Nitrates reduce preload and may precipitate profound hypotension in RV infarction." }, { optionId: "C", reason: "Diuresis further reduces preload; there is no pulmonary congestion." }, { optionId: "D", reason: "Bradycardia and shock are contraindications to acute beta-blockade." }],
      trap: "Treating every STEMI chest-pain patient with nitrates before checking for RV involvement.", clue: "Hypotension + raised JVP + clear lungs = right ventricle needs preload.", memoryTip: "RV infarct: Right-sided leads, Raise preload, Rush reperfusion.", sourceTags: ["ACS", "RV infarction", "shock"]
    },
    {
      id: "demo-2", number: 2, subject: "OBGY", integratedSubjects: ["Hematology", "Critical care"], setting: "Labor room", difficulty: "Hard",
      stem: "A 26-year-old primigravida at 35 weeks has severe epigastric pain and headache. BP is 168/112 mmHg. Platelets are 62,000/µL, AST 186 U/L, LDH 780 U/L, and peripheral smear shows schistocytes. Fetal tracing is currently reassuring. After maternal stabilization with magnesium sulfate and antihypertensive therapy, the next best step is:",
      options: [{ id: "A", text: "Expectant management until 37 weeks" }, { id: "B", text: "Platelet transfusion and observation for 48 hours" }, { id: "C", text: "Prompt delivery after stabilization" }, { id: "D", text: "High-dose corticosteroids as definitive maternal treatment" }],
      correctOptionId: "C", explanation: "This is HELLP syndrome with severe features at 35 weeks. Definitive treatment is delivery after immediate maternal stabilization; a reassuring fetal trace does not remove maternal risk.",
      whyOthersWrong: [{ optionId: "A", reason: "Ongoing pregnancy exposes the mother to DIC, abruption, liver hematoma and stroke." }, { optionId: "B", reason: "Platelets are used for bleeding or procedural thresholds, not as definitive therapy." }, { optionId: "D", reason: "Steroids may aid fetal lung maturity or transiently affect counts but do not replace delivery." }],
      trap: "Choosing fetal reassurance over the maternal indication for delivery.", clue: "Hemolysis + Elevated Liver enzymes + Low Platelets.", memoryTip: "HELLP ends when the placenta leaves.", sourceTags: ["HELLP", "preeclampsia", "delivery"]
    },
    {
      id: "demo-3", number: 3, subject: "Medicine", integratedSubjects: ["Endocrinology", "Biochemistry"], setting: "ICU", difficulty: "Moderate",
      stem: "A 21-year-old woman with type 1 diabetes has vomiting and abdominal pain. Glucose is 468 mg/dL, Na⁺ 132 mmol/L, K⁺ 2.9 mmol/L, bicarbonate 9 mmol/L, and arterial pH 7.12. Urine ketones are positive. After the initial isotonic saline bolus, what should be done next?",
      options: [{ id: "A", text: "Start IV insulin infusion immediately" }, { id: "B", text: "Give IV potassium before insulin" }, { id: "C", text: "Administer IV sodium bicarbonate" }, { id: "D", text: "Switch to 5% dextrose saline" }],
      correctOptionId: "B", explanation: "Total body potassium is depleted in DKA. With serum K⁺ below 3.3 mmol/L, insulin must be held while potassium is replaced because insulin can trigger a fatal arrhythmia by shifting potassium intracellularly.",
      whyOthersWrong: [{ optionId: "A", reason: "Insulin is temporarily unsafe at this potassium level." }, { optionId: "C", reason: "Bicarbonate is generally reserved for extreme acidemia, commonly pH below 6.9." }, { optionId: "D", reason: "Dextrose is added later as glucose falls while ketonemia is still clearing." }],
      trap: "Recognizing DKA and reflexively selecting insulin without checking potassium.", clue: "K⁺ 2.9 is the decision-changing value.", memoryTip: "DKA: if K is low, K comes before insulin.", sourceTags: ["DKA", "potassium", "acid-base"]
    },
    {
      id: "demo-4", number: 4, subject: "Surgery", integratedSubjects: ["Radiology", "Trauma"], setting: "Emergency", difficulty: "Hard",
      stem: "A 32-year-old motorcyclist arrives after blunt chest trauma. He is agitated, BP 78/46 mmHg, pulse 136/min, SpO₂ 84%. The left hemithorax is hyperresonant with absent breath sounds and the trachea is deviated to the right. The immediate next step is:",
      options: [{ id: "A", text: "Portable chest radiograph" }, { id: "B", text: "CT chest with contrast" }, { id: "C", text: "Immediate pleural decompression followed by tube thoracostomy" }, { id: "D", text: "Diagnostic thoracentesis and fluid analysis" }],
      correctOptionId: "C", explanation: "This is a clinical diagnosis of tension pneumothorax causing obstructive shock. Decompression must not wait for imaging, and definitive tube thoracostomy follows.",
      whyOthersWrong: [{ optionId: "A", reason: "Imaging delays a lifesaving bedside intervention." }, { optionId: "B", reason: "An unstable patient should not be transferred to CT." }, { optionId: "D", reason: "This is not an undifferentiated pleural effusion." }],
      trap: "Selecting the most informative investigation instead of the immediate lifesaving action.", clue: "Shock + unilateral absent breath sounds + tracheal shift.", memoryTip: "Tension is treated before it is photographed.", sourceTags: ["ATLS", "tension pneumothorax", "obstructive shock"]
    },
    {
      id: "demo-5", number: 5, subject: "PSM", integratedSubjects: ["Medicine", "Epidemiology"], setting: "OPD", difficulty: "Moderate",
      stem: "A new point-of-care test for pulmonary tuberculosis is evaluated in 2,000 symptomatic adults against culture. Investigators deliberately enroll 1,000 culture-positive and 1,000 culture-negative participants, then calculate the proportion of all participants who test positive and call it the disease prevalence. Which measure remains directly valid in this design?",
      options: [{ id: "A", text: "Positive predictive value" }, { id: "B", text: "Negative predictive value" }, { id: "C", text: "Sensitivity" }, { id: "D", text: "Population prevalence" }],
      correctOptionId: "C", explanation: "This is effectively a case-control sampling design with disease status fixed by investigators. Sensitivity and specificity can be estimated, but predictive values and prevalence depend on the sampled disease proportion and are not population estimates.",
      whyOthersWrong: [{ optionId: "A", reason: "PPV changes with prevalence, which was artificially set here." }, { optionId: "B", reason: "NPV also depends on prevalence." }, { optionId: "D", reason: "The 50% proportion is imposed by sampling, not measured in a population." }],
      trap: "Using the apparent 50% disease proportion as real prevalence.", clue: "When investigators choose cases and controls, start from disease status.", memoryTip: "Case-control can preserve Se/Sp, not prevalence or predictive values.", sourceTags: ["diagnostic test", "case-control", "sensitivity"]
    }
  ]
};
