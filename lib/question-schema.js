const optionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", enum: ["A", "B", "C", "D"] },
    text: { type: "string" }
  },
  required: ["id", "text"]
};

export function questionBatchSchema(count) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: { type: "string" },
            integratedSubjects: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            setting: { type: "string", enum: ["Emergency", "ICU", "OPD", "Ward", "Labor room", "OT", "Postoperative"] },
            difficulty: { type: "string", enum: ["Moderate", "Hard", "Very hard"] },
            stem: { type: "string" },
            options: { type: "array", minItems: 4, maxItems: 4, items: optionSchema },
            correctOptionId: { type: "string", enum: ["A", "B", "C", "D"] },
            explanation: { type: "string" },
            whyOthersWrong: {
              type: "array", minItems: 3, maxItems: 3,
              items: {
                type: "object", additionalProperties: false,
                properties: { optionId: { type: "string", enum: ["A", "B", "C", "D"] }, reason: { type: "string" } },
                required: ["optionId", "reason"]
              }
            },
            trap: { type: "string" },
            clue: { type: "string" },
            memoryTip: { type: "string" },
            sourceTags: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            evidenceLevel: { type: "string", enum: ["Official/current guideline", "Established standard", "Foundational consensus"] },
            timeSensitivity: { type: "string", enum: ["Stable", "Guideline-sensitive", "Surveillance-sensitive"] },
            answerCheck: { type: "string" }
          },
          required: ["subject", "integratedSubjects", "setting", "difficulty", "stem", "options", "correctOptionId", "explanation", "whyOthersWrong", "trap", "clue", "memoryTip", "sourceTags", "evidenceLevel", "timeSensitivity", "answerCheck"]
        }
      }
    },
    required: ["questions"]
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
