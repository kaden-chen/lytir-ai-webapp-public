import { Box, Group, Text, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { DIAG_QUERY_KEY, fetchDiag, isAdmin } from "@/lib/diag";
import {
  SERVICE_STATE_DESCRIPTION,
  SERVICE_STATE_LABEL,
  serviceState,
} from "@/features/status/serviceState";

const REFETCH_INTERVAL_MS = 60_000;

const DOT_COLOUR = {
  online: "teal.6",
  offline: "red.6",
  unknown: "gray.5",
} as const;

export function ServiceStatus() {
  const { data, error } = useQuery({
    queryKey: DIAG_QUERY_KEY,
    queryFn: fetchDiag,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Role comes from the response, so nothing renders until a call has
  // succeeded at least once. After that, TanStack keeps the last successful
  // data through later failures, which is what lets the indicator report a
  // problem rather than disappearing at the moment it matters.
  if (!isAdmin(data)) {
    return null;
  }

  const state = serviceState({
    error,
    browserOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  });
  const description = SERVICE_STATE_DESCRIPTION[state];

  return (
    <Tooltip label={description} withArrow>
      {/* Focusable and labelled, because a coloured dot alone is unreadable
          without colour vision and a tooltip alone is unreachable by
          keyboard. The text label carries the same information visibly. */}
      <Group
        role="status"
        aria-label={description}
        tabIndex={0}
        gap={6}
        wrap="nowrap"
      >
        <Box
          w={8}
          h={8}
          bg={DOT_COLOUR[state]}
          style={{ borderRadius: "50%" }}
        />
        <Text size="xs" c="dimmed" visibleFrom="sm">
          {SERVICE_STATE_LABEL[state]}
        </Text>
      </Group>
    </Tooltip>
  );
}
