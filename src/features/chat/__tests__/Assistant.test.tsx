import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiQaResponse } from "@/features/chat/askQuestion";

const { askQuestionMock, isAdminMock } = vi.hoisted(() => ({
  askQuestionMock: vi.fn<(question: string) => Promise<AiQaResponse>>(),
  isAdminMock: vi.fn(() => false),
}));

vi.mock("@/features/chat/askQuestion", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/chat/askQuestion")
  >("@/features/chat/askQuestion");
  return { ...actual, askQuestion: askQuestionMock };
});

vi.mock("@/lib/diag", () => ({
  DIAG_QUERY_KEY: ["diag"],
  fetchDiag: vi.fn(async () => ({})),
  isAdmin: () => isAdminMock(),
}));

const { Assistant } = await import("@/features/chat/Assistant");

function answered(overrides: Partial<AiQaResponse> = {}): AiQaResponse {
  return {
    question: "Was there earthquakes in Hawaii today?",
    outcome: "answered",
    answer: "Yes. **Five earthquakes** were recorded in Hawaii today.",
    answer_format: "markdown",
    confidence: 0.99,
    execution_seconds: 15.67,
    model: { host: "azure", profile: "AZURE_GPT", name: "gpt-5.6-sol" },
    utc_now: "2026-09-13T05:27:08.964924Z",
    ...overrides,
  };
}

function renderChat() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <Assistant />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

function ask(question: string) {
  fireEvent.change(screen.getByLabelText(/Ask about earthquakes/), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ask" }));
}

beforeEach(() => {
  askQuestionMock.mockReset();
  isAdminMock.mockReturnValue(false);
});

describe("Assistant", () => {
  it("sends the question and renders the answer as formatted text", async () => {
    askQuestionMock.mockResolvedValue(answered());
    renderChat();

    ask("Was there earthquakes in Hawaii today?");

    expect(await screen.findByText("Five earthquakes")).toBeTruthy();
    // The first argument only: TanStack also passes a context object.
    expect(askQuestionMock.mock.calls[0]?.[0]).toBe(
      "Was there earthquakes in Hawaii today?",
    );
  });

  it("says the confidence is the model's own estimate", async () => {
    askQuestionMock.mockResolvedValue(answered());
    renderChat();

    ask("anything");

    expect(
      await screen.findByText(/own confidence estimate: 99%/),
    ).toBeTruthy();
  });

  it("hides timing and model detail from a non-administrator", async () => {
    askQuestionMock.mockResolvedValue(answered({ skill: "lytir_data" }));
    renderChat();

    ask("anything");

    await screen.findByText("Five earthquakes");
    expect(screen.queryByText(/gpt-5.6-sol/)).toBeNull();
  });

  it("shows timing and model detail to an administrator", async () => {
    isAdminMock.mockReturnValue(true);
    askQuestionMock.mockResolvedValue(answered({ skill: "lytir_data" }));
    renderChat();

    ask("anything");

    expect(await screen.findByText(/gpt-5.6-sol/)).toBeTruthy();
  });

  it("warns when an answer came from general knowledge rather than Lytir", async () => {
    askQuestionMock.mockResolvedValue(
      answered({
        answer: "California did experience earthquakes in 2000.",
        data_status: "outside_available_range",
        knowledge_source: "model_knowledge",
        events: [],
      }),
    );
    renderChat();

    ask("Were there earthquakes in California in 2000?");

    expect(await screen.findByText(/Not from Lytir observations/)).toBeTruthy();
  });

  it("resends the original question with a reply to a clarification", async () => {
    askQuestionMock.mockResolvedValueOnce(
      answered({
        outcome: "clarification_required",
        answer: "What time period should I search?",
        confidence: undefined,
      }),
    );
    renderChat();

    ask("What was the largest earthquake?");
    await screen.findByText("What time period should I search?");

    askQuestionMock.mockResolvedValueOnce(answered());
    fireEvent.change(screen.getByLabelText("Your reply"), {
      target: { value: "the last 24 hours" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    await screen.findByText("Five earthquakes");
    const sent = askQuestionMock.mock.calls[1]?.[0] ?? "";
    expect(sent).toContain("What was the largest earthquake?");
    expect(sent).toContain("the last 24 hours");
  });

  it("omits confidence when the assistant asks a question back", async () => {
    askQuestionMock.mockResolvedValue(
      answered({
        outcome: "clarification_required",
        answer: "Which period?",
        confidence: undefined,
      }),
    );
    renderChat();

    ask("What was the largest earthquake?");

    await screen.findByText("Which period?");
    expect(screen.queryByText(/confidence estimate/)).toBeNull();
  });

  it("reports a failure with its correlation identifier", async () => {
    const { ApiError } = await import("@/lib/api");
    askQuestionMock.mockRejectedValue(
      new ApiError("Request failed with status 503", {
        status: 503,
        correlationId: "abc-123",
      }),
    );
    renderChat();

    ask("anything");

    expect(await screen.findByText(/Could not get an answer/)).toBeTruthy();
    expect(await screen.findByText(/abc-123/)).toBeTruthy();
  });

  it("clears the exchange when starting fresh", async () => {
    askQuestionMock.mockResolvedValue(answered());
    renderChat();

    ask("anything");
    await screen.findByText("Five earthquakes");

    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));

    expect(screen.queryByText("Five earthquakes")).toBeNull();
  });
});
