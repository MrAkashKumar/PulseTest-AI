const optionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    i: { type: "string", enum: ["A", "B", "C", "D"] },
    t: { type: "string" }
  },
  required: ["i", "t"]
};

export function questionBatchSchema(count) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      qs: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            sj: { type: "string" },
            is: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            se: { type: "string", enum: ["Emergency", "ICU", "OPD", "Ward", "Labor room", "OT", "Postoperative"] },
            df: { type: "string", enum: ["Moderate", "Hard", "Very hard"] },
            st: { type: "string" },
            op: { type: "array", minItems: 4, maxItems: 4, items: optionSchema },
            ca: { type: "string", enum: ["A", "B", "C", "D"] },
            ex: { type: "string" },
            wo: {
              type: "array", minItems: 3, maxItems: 3,
              items: {
                type: "object", additionalProperties: false,
                properties: { i: { type: "string", enum: ["A", "B", "C", "D"] }, r: { type: "string" } },
                required: ["i", "r"]
              }
            },
            tr: { type: "string" },
            cl: { type: "string" },
            mt: { type: "string" },
            tg: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            ev: { type: "string", enum: ["Official/current guideline", "Established standard", "Foundational consensus"] },
            ts: { type: "string", enum: ["Stable", "Guideline-sensitive", "Surveillance-sensitive"] },
            ac: { type: "string" }
          },
          required: ["sj", "is", "se", "df", "st", "op", "ca", "ex", "wo", "tr", "cl", "mt", "tg", "ev", "ts", "ac"]
        }
      }
    },
    required: ["qs"]
  };
}

export function expandQuestionBatchPayload(payload = {}) {
  const list = Array.isArray(payload.qs) ? payload.qs : Array.isArray(payload.questions) ? payload.questions : [];
  return {
    questions: list.map((question) => ({
      subject: question.sj ?? question.subject,
      integratedSubjects: question.is ?? question.integratedSubjects ?? [],
      setting: question.se ?? question.setting,
      difficulty: question.df ?? question.difficulty,
      stem: question.st ?? question.stem,
      options: (question.op ?? question.options ?? []).map((option) => ({
        id: option.i ?? option.id,
        text: option.t ?? option.text
      })),
      correctOptionId: question.ca ?? question.correctOptionId,
      explanation: question.ex ?? question.explanation,
      whyOthersWrong: (question.wo ?? question.whyOthersWrong ?? []).map((item) => ({
        optionId: item.i ?? item.optionId,
        reason: item.r ?? item.reason
      })),
      trap: question.tr ?? question.trap,
      clue: question.cl ?? question.clue,
      memoryTip: question.mt ?? question.memoryTip,
      sourceTags: question.tg ?? question.sourceTags ?? [],
      evidenceLevel: question.ev ?? question.evidenceLevel,
      timeSensitivity: question.ts ?? question.timeSensitivity,
      answerCheck: question.ac ?? question.answerCheck
    }))
  };
}

export const researchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    examSignals: { type: "array", minItems: 4, maxItems: 8, items: { type: "string" } },
    highYieldTopics: {
      type: "array", minItems: 12, maxItems: 30,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          topic: { type: "string" },
          subject: { type: "string" },
          priority: { type: "string", enum: ["High", "Very high"] },
          rationale: { type: "string" }
        },
        required: ["topic", "subject", "priority", "rationale"]
      }
    },
    guidelineWatch: { type: "array", minItems: 3, maxItems: 8, items: { type: "string" } },
    historicalPatterns: {
      type: "array", minItems: 4, maxItems: 10,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          era: { type: "string" },
          shift: { type: "string" },
          evidenceType: { type: "string", enum: ["Official", "Recall signal", "Inference"] }
        },
        required: ["era", "shift", "evidenceType"]
      }
    },
    forecastTopics: {
      type: "array", minItems: 6, maxItems: 15,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          horizon: { type: "string", enum: ["Next exam", "1–3 years", "3–10 years"] },
          topic: { type: "string" },
          rationale: { type: "string" },
          confidence: { type: "string", enum: ["Low", "Medium", "High"] }
        },
        required: ["horizon", "topic", "rationale", "confidence"]
      }
    },
    diseaseWatch: {
      type: "array", minItems: 4, maxItems: 12,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          disease: { type: "string" },
          geography: { type: "string" },
          signal: { type: "string" },
          examAngle: { type: "string" },
          status: { type: "string", enum: ["Active signal", "Seasonal", "Foundational"] }
        },
        required: ["disease", "geography", "signal", "examAngle", "status"]
      }
    },
    methodologyNote: { type: "string" },
    generatedAt: { type: "string" }
  },
  required: ["headline", "summary", "examSignals", "highYieldTopics", "guidelineWatch", "historicalPatterns", "forecastTopics", "diseaseWatch", "methodologyNote", "generatedAt"]
};
