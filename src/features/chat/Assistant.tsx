import { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import "@/features/chat/Assistant.css";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnswerCard } from "@/features/chat/AnswerCard";
import type { AiQaResponse } from "@/features/chat/askQuestion";
import {
  MAX_QUESTION_CHARACTERS,
  askQuestion,
} from "@/features/chat/askQuestion";
import { packFollowUp } from "@/features/chat/packQuestion";
import { ApiError } from "@/lib/api";
import { DIAG_QUERY_KEY, fetchDiag, isAdmin } from "@/lib/diag";

// Phrased as questions, because the point is to show what the assistant can
// understand. Abbreviated to fragments they read as filters, which is a
// different promise entirely.
const EXAMPLES = [
  "Earthquakes worldwide in the last hour",
  "Any earthquakes near Dallas?",
  "What was the strongest earthquake recently?",
];

interface Exchange {
  sent: string;
  response: AiQaResponse;
}

interface AssistantProps {
  /**
   * Set on a narrow viewport, where vertical space is the scarce resource.
   * The composer starts at a single row and is capped lower, so an empty box
   * takes no height it has not earned and a growing one cannot swallow the
   * answer being read.
   */
  compact?: boolean;
}

export function Assistant({ compact = false }: AssistantProps = {}) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [tooLongToCombine, setTooLongToCombine] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Examples appear when the reader is actually about to type, not
  // permanently. Three filled pills sitting above an empty box read as
  // preset filters and, on a narrow viewport, wrapped to three lines and
  // pushed the question box towards the fold.
  const [inputFocused, setInputFocused] = useState(false);

  const { data: diag } = useQuery({
    queryKey: DIAG_QUERY_KEY,
    queryFn: fetchDiag,
    retry: 1,
  });

  const ask = useMutation({
    mutationFn: askQuestion,
    onSuccess: (response, sent) => {
      setExchanges((previous) => [...previous, { sent, response }]);
      setDraft("");
    },
  });

  // A question can legitimately take tens of seconds, so the wait shows a
  // count. A motionless spinner at fifteen seconds reads as a hung page.
  useEffect(() => {
    if (!ask.isPending) {
      setElapsed(0);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [ask.isPending]);

  const last = exchanges.at(-1);
  const replyingToClarification =
    last?.response.outcome === "clarification_required";

  function submit() {
    const typed = draft.trim();

    if (!typed || ask.isPending) {
      return;
    }

    // The service remembers nothing, so a reply to a clarification has to
    // carry the original question with it.
    const sent = replyingToClarification
      ? packFollowUp({
          askedQuestion: last.sent,
          clarification: last.response.answer,
          reply: typed,
        })
      : typed;

    if (sent === null) {
      setTooLongToCombine(true);
      return;
    }

    setTooLongToCombine(false);
    ask.mutate(sent);
  }

  const overLimit = draft.trim().length > MAX_QUESTION_CHARACTERS;

  return (
    // Fills the panel it owns, rather than being sized by its content. The
    // transcript takes the space and scrolls; the composer is pinned to the
    // foot, which is where a reader looks for it and where it stays as
    // answers accumulate. In the previous layout this was a section stacked
    // among others, so it capped its transcript instead — in a panel of its
    // own that cap would leave the question box floating in the middle.
    <Stack gap="sm" p="sm" style={{ flex: 1, minHeight: 0 }}>
      <Box style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack gap="md" aria-live="polite">
          {exchanges.length === 0 && !ask.isPending && inputFocused ? (
            <Stack gap={6}>
              <Text size="xs" c="dimmed">
                Try one of these, or ask your own question.
              </Text>
              <Stack gap={4} align="flex-start">
                {EXAMPLES.map((example) => (
                  <Button
                    key={example}
                    variant="subtle"
                    size="compact-xs"
                    // One per line and quiet. Wrapped pills produced a ragged
                    // block whose shape changed with the panel width.
                    onMouseDown={(event) => {
                      // The textarea would otherwise lose focus before the
                      // click landed, unmounting this control mid-press.
                      event.preventDefault();
                    }}
                    onClick={() => setDraft(example)}
                  >
                    {example}
                  </Button>
                ))}
              </Stack>
            </Stack>
          ) : null}

          {exchanges.map((exchange, index) => (
            <AnswerCard
              // The service returns no identifier, and two identical questions
              // are legitimate, so position is the only honest key.
              key={`${index}-${exchange.sent.length}`}
              sent={exchange.sent}
              response={exchange.response}
              showDetail={isAdmin(diag)}
            />
          ))}

          {ask.isPending ? (
            <Group gap="sm">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                Working on it… {elapsed}s. Questions that need earthquake data
                take longer.
              </Text>
            </Group>
          ) : null}

          {ask.error ? (
            <Alert color="red" title="Could not get an answer">
              <Text size="sm">{ask.error.message}</Text>
              {ask.error instanceof ApiError && ask.error.correlationId ? (
                <Text size="xs" c="dimmed" mt="xs">
                  Correlation ID: {ask.error.correlationId}
                </Text>
              ) : null}
            </Alert>
          ) : null}

          {tooLongToCombine ? (
            <Alert color="yellow" title="Too long to send together">
              <Text size="sm">
                Your question and reply are longer than the assistant accepts
                together. Start a new question that includes the detail.
              </Text>
            </Alert>
          ) : null}
        </Stack>
      </Box>

      {/* Pinned: the transcript above takes the leftover height, so this never
          moves as answers arrive. One surface holds the question and its
          controls, so the text keeps the full width and the action sits where
          a reader's eye ends rather than beside a box that changes height. */}
      <Box className="lytir-composer" style={{ flex: "0 0 auto" }}>
        {replyingToClarification ? (
          <Text size="xs" c="dimmed" px={4}>
            Sent together with your original question.
          </Text>
        ) : null}
        <Textarea
          variant="unstyled"
          styles={{ input: { padding: "2px 6px" } }}
          // Labelled for assistive technology but not visibly: the section
          // heading and the placeholder already say what this is, and a third
          // label only costs height.
          aria-label={
            replyingToClarification ? "Your reply" : "Ask about earthquakes"
          }
          placeholder={
            replyingToClarification
              ? "Your reply…"
              : "Ask about recent earthquakes…"
          }
          autosize
          minRows={compact ? 1 : 3}
          maxRows={compact ? 4 : 8}
          value={draft}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {/* The footer of the same surface: what the keyboard does on the left,
            the actions on the right. The limit takes the hint's place rather
            than adding a line, so the composer never changes height to scold
            anyone. */}
        <Group justify="space-between" gap="xs" wrap="nowrap" px={4} mih={30}>
          <Text fz="xs" c={overLimit ? "red" : "dimmed"} lineClamp={1}>
            {overLimit
              ? `Questions are limited to ${MAX_QUESTION_CHARACTERS} characters.`
              : inputFocused
                ? "Enter to ask · Shift+Enter for a new line"
                : ""}
          </Text>
          <Group gap={6} wrap="nowrap">
            {exchanges.length > 0 ? (
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={() => {
                  setExchanges([]);
                  setTooLongToCombine(false);
                  ask.reset();
                }}
              >
                Start fresh
              </Button>
            ) : null}
            <ActionIcon
              radius="xl"
              size="lg"
              aria-label="Ask"
              onClick={submit}
              loading={ask.isPending}
              disabled={!draft.trim() || overLimit}
            >
              {/* Inline, like the other glyphs in this application. */}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </ActionIcon>
          </Group>
        </Group>
      </Box>
    </Stack>
  );
}
