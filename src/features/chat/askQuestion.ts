import { apiRequest } from "@/lib/api";
import { env } from "@/lib/env";

/** Enforced by the service; a longer question is rejected with a 400. */
export const MAX_QUESTION_CHARACTERS = 4000;

export type AnswerOutcome =
  "answered" | "clarification_required" | "incomplete";

// Only the fields present in normal mode are treated as dependable. `skill`,
// `usage`, and `data_context` exist only while the service runs in debug mode,
// which its own design says must not be the case in a shared environment, so
// nothing the reader depends on may be built from them.
export interface AiQaResponse {
  question: string;
  outcome: AnswerOutcome;
  answer: string;
  answer_format: string;
  /** The model's own estimate. Absent from a clarification, which claims nothing. */
  confidence?: number;
  execution_seconds?: number;
  model?: {
    host?: string;
    profile?: string;
    name?: string;
  };
  utc_now?: string;
  /** Present only when the question fell wholly outside the observed range. */
  data_status?: string;
  knowledge_source?: string;
  events?: unknown[];
  // Debug-only below this line.
  skill?: string;
  usage?: {
    requests?: number;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  data_context?: unknown;
}

/**
 * True when the answer came from the model's general knowledge because Lytir
 * holds no observations for the period. Such an answer must never be presented
 * as a verified Lytir observation.
 */
export function isModelKnowledge(response: AiQaResponse): boolean {
  return (
    response.knowledge_source === "model_knowledge" ||
    response.data_status === "outside_available_range"
  );
}

export function askQuestion(question: string): Promise<AiQaResponse> {
  return apiRequest<AiQaResponse>(env.api.aiQa, {
    method: "POST",
    // The service rejects unknown properties, so the body carries the question
    // and nothing else.
    body: JSON.stringify({ question }),
    headers: { "Content-Type": "application/json" },
  });
}
