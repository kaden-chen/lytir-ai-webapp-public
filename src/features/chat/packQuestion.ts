import { MAX_QUESTION_CHARACTERS } from "@/features/chat/askQuestion";

interface FollowUp {
  /** The question that produced the clarification. */
  askedQuestion: string;
  /** What the service asked for. */
  clarification: string;
  /** What the reader typed in response. */
  reply: string;
}

/**
 * The service keeps no memory between requests, so a reply to a clarification
 * has to be sent as one complete question. The service's own clarifying text is
 * included because a bare reply like "last 24 hours" means nothing without it.
 *
 * Returns null when even the shortened form cannot fit, which is the signal to
 * make the reader start a fresh question rather than silently sending a
 * truncated one and presenting the answer as if it addressed the whole thing.
 */
export function packFollowUp({
  askedQuestion,
  clarification,
  reply,
}: FollowUp): string | null {
  const question = askedQuestion.trim();
  const asked = clarification.trim();
  const answered = reply.trim();

  const full = `${question}\n\nYou asked: ${asked}\nMy answer: ${answered}`;

  if (full.length <= MAX_QUESTION_CHARACTERS) {
    return full;
  }

  // The clarifying text is the least essential part, so it goes first.
  const withoutClarification = `${question}\n\n${answered}`;

  return withoutClarification.length <= MAX_QUESTION_CHARACTERS
    ? withoutClarification
    : null;
}
