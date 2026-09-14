import { Alert, Badge, Group, Paper, Stack, Text } from "@mantine/core";
import type { AiQaResponse } from "@/features/chat/askQuestion";
import { isModelKnowledge } from "@/features/chat/askQuestion";
import { SafeMarkdown } from "@/features/chat/SafeMarkdown";

interface AnswerCardProps {
  /** What was actually sent, which is not always what the reader typed. */
  sent: string;
  response: AiQaResponse;
  /** Extra detail is for administrators; it is presentation, not permission. */
  showDetail: boolean;
}

const OUTCOME_LABEL = {
  answered: null,
  clarification_required: "Needs more detail",
  incomplete: "Partial answer",
} as const;

export function AnswerCard({ sent, response, showDetail }: AnswerCardProps) {
  const label = OUTCOME_LABEL[response.outcome] ?? null;

  return (
    <Stack gap="xs">
      <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-default)">
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {sent}
        </Text>
      </Paper>

      <Paper withBorder p="sm" radius="md">
        <Stack gap="xs">
          {label ? (
            <Badge variant="light" color="gray">
              {label}
            </Badge>
          ) : null}

          {/* Provenance comes before the answer, so a reader cannot absorb an
              unverified claim and only then learn where it came from. */}
          {isModelKnowledge(response) ? (
            <Alert color="yellow" title="Not from Lytir observations">
              <Text size="sm">
                Lytir holds no recorded earthquakes for this period. The answer
                below comes from the model&apos;s general knowledge and has not
                been checked against Lytir data.
              </Text>
            </Alert>
          ) : null}

          <SafeMarkdown>{response.answer}</SafeMarkdown>

          {response.outcome === "clarification_required" ? (
            <Text size="xs" c="dimmed">
              Answer below and your original question will be sent again with
              it, because the assistant does not remember previous messages.
            </Text>
          ) : null}

          <Group gap="xs" justify="space-between" wrap="wrap">
            {/* Self-reported by the model, so it is labelled as an estimate
                rather than shown as a score. Absent from a clarification,
                which makes no factual claim. */}
            {typeof response.confidence === "number" ? (
              <Text size="xs" c="dimmed">
                Model&apos;s own confidence estimate:{" "}
                {Math.round(response.confidence * 100)}%
              </Text>
            ) : (
              <span />
            )}

            {showDetail ? (
              <Text size="xs" c="dimmed">
                {[
                  response.skill,
                  response.model?.name,
                  typeof response.execution_seconds === "number"
                    ? `${response.execution_seconds.toFixed(1)}s`
                    : null,
                  typeof response.usage?.total_tokens === "number"
                    ? `${response.usage.total_tokens} tokens`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
