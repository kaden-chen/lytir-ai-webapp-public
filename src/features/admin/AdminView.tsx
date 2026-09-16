import { useId } from "react";
import { Alert, Box, Button, Code, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import "@/features/admin/AdminView.css";
import { formatEvidence, syncData } from "@/features/admin/syncData";
import { EARTHQUAKES_QUERY_KEY } from "@/features/map/earthquakes";
import { ApiError } from "@/lib/api";
import { DIAG_QUERY_KEY, fetchDiag, isAdmin } from "@/lib/diag";

/**
 * Administrator operations on the deployment's data.
 *
 * The view is shown to every reader and its controls are disabled for anyone
 * who is not an administrator, so the interface has the same shape for
 * everyone and later views that manage a reader's own work have somewhere to
 * live. The edge verifies the token and the role on its own; nothing here is
 * a permission.
 */
export function AdminView() {
  const queryClient = useQueryClient();
  const restrictionId = useId();

  const { data: diag } = useQuery({
    queryKey: DIAG_QUERY_KEY,
    queryFn: fetchDiag,
    retry: 1,
  });

  const admin = isAdmin(diag);

  const sync = useMutation({
    mutationFn: syncData,
    onSuccess: () => {
      // The response is the receipt; the map and the table re-read their own
      // query rather than being written from it. A published event can fall
      // outside the window they asked for, so a refresh legitimately changes
      // nothing on screen — which is why the receipt is shown at all.
      void queryClient.invalidateQueries({ queryKey: EARTHQUAKES_QUERY_KEY });
    },
  });

  return (
    // Fills the panel: the controls keep their height at the top and the
    // response takes what is left, rather than stopping part-way down and
    // leaving the rest of the panel blank.
    <Stack gap="sm" p="sm" style={{ flex: 1, minHeight: 0 }}>
      <Text size="sm" c="dimmed">
        Fetches new events from USGS and stores them. This reaches upstream
        rather than redrawing what is already loaded.
      </Text>

      <Button
        onClick={() => sync.mutate()}
        loading={sync.isPending}
        disabled={!admin || sync.isPending}
        aria-describedby={admin ? undefined : restrictionId}
      >
        Fetch latest from USGS
      </Button>

      {admin ? null : (
        // Stated in visible text rather than a tooltip: a disabled control is
        // not focusable in every browser, so a title attribute is unreachable
        // by keyboard and frequently unread.
        <Text id={restrictionId} size="xs" c="dimmed">
          Only an administrator can run a refresh.
        </Text>
      )}

      {/* Announced rather than merely appearing, because a button that
          quietly re-enables tells a screen reader nothing. */}
      <Box
        aria-live="polite"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sync.isError ? (
          <Alert color="red" title="Could not refresh the data">
            <Text size="sm">{sync.error.message}</Text>
            {sync.error instanceof ApiError && sync.error.correlationId ? (
              <Text size="xs" c="dimmed" mt="xs">
                Correlation ID: {sync.error.correlationId}
              </Text>
            ) : null}
          </Alert>
        ) : null}

        {sync.isSuccess ? (
          <Stack gap={6} style={{ flex: 1, minHeight: 0 }}>
            <Text size="sm">
              Refresh complete. Recent earthquakes reloaded.
            </Text>
            {/* Scrolls inside itself, so a run returning fifty events cannot
                push the panel around. Rendered as text: the events carry
                upstream place names. */}
            <Code block fz="xs" className="lytir-evidence">
              {formatEvidence(sync.data)}
            </Code>
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
}
