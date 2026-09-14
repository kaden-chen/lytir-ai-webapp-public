import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
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

export function Assistant() {
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
    // Sized by its content, so an empty assistant is a title, a line of help,
    // three prompts and a box — not a tall blank reserve. The transcript is
    // what is capped, so it scrolls once it has grown and the question box
    // stays directly beneath it either way.
    <Stack gap="sm" p="sm">
      <Box style={{ maxHeight: "min(42vh, 420px)", overflowY: "auto" }}>
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

      <Stack gap={6}>
        {/* One line that grows, with the action beside it rather than below.
            A two-row box and a small button underneath made the primary
            action of the feature look like an afterthought. */}
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <Textarea
            // Labelled for assistive technology but not visibly: the section
            // heading and the placeholder already say what this is, and a
            // third label only costs height.
            aria-label={
              replyingToClarification ? "Your reply" : "Ask about earthquakes"
            }
            description={
              replyingToClarification
                ? "Sent together with your original question."
                : undefined
            }
            placeholder={
              replyingToClarification
                ? "Your reply…"
                : "Ask about recent earthquakes…"
            }
            autosize
            minRows={1}
            maxRows={4}
            style={{ flex: 1 }}
            value={draft}
            error={
              overLimit
                ? `Questions are limited to ${MAX_QUESTION_CHARACTERS} characters.`
                : undefined
            }
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
          <Button
            onClick={submit}
            loading={ask.isPending}
            disabled={!draft.trim() || overLimit}
          >
            Ask
          </Button>
        </Group>
        <Group justify="space-between" gap="xs" mih={22}>
          {/* Shown while typing rather than permanently. A keyboard hint is
              worth one line when it is about to be used and is clutter the
              rest of the time. */}
          <Text fz="xs" c="dimmed">
            {inputFocused ? "Enter to ask · Shift+Enter for a new line" : ""}
          </Text>
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
        </Group>
      </Stack>
    </Stack>
  );
}
