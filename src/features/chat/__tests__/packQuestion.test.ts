import { describe, expect, it } from "vitest";
import { MAX_QUESTION_CHARACTERS } from "@/features/chat/askQuestion";
import { packFollowUp } from "@/features/chat/packQuestion";

describe("packFollowUp", () => {
  it("carries the original question, so the service does not need memory", () => {
    const packed = packFollowUp({
      askedQuestion: "What was the largest earthquake?",
      clarification: "What time period should I search?",
      reply: "the last 24 hours",
    });

    expect(packed).toContain("What was the largest earthquake?");
    expect(packed).toContain("the last 24 hours");
  });

  it("includes what was asked, so a bare reply still makes sense", () => {
    const packed = packFollowUp({
      askedQuestion: "What was the largest earthquake?",
      clarification: "What time period should I search?",
      reply: "the last 24 hours",
    });

    expect(packed).toContain("What time period should I search?");
  });

  it("ignores surrounding whitespace", () => {
    const packed = packFollowUp({
      askedQuestion: "  Largest earthquake?  ",
      clarification: "  Which period?  ",
      reply: "  today  ",
    });

    expect(packed).toBe(
      "Largest earthquake?\n\nYou asked: Which period?\nMy answer: today",
    );
  });

  it("drops the quoted question first when the limit is tight", () => {
    const askedQuestion = "q".repeat(MAX_QUESTION_CHARACTERS - 60);
    const packed = packFollowUp({
      askedQuestion,
      clarification: "c".repeat(200),
      reply: "today",
    });

    expect(packed).not.toBeNull();
    expect(packed).not.toContain("You asked:");
    expect(packed).toContain("today");
    expect((packed as string).length).toBeLessThanOrEqual(
      MAX_QUESTION_CHARACTERS,
    );
  });

  it("refuses rather than silently truncating when nothing fits", () => {
    expect(
      packFollowUp({
        askedQuestion: "q".repeat(MAX_QUESTION_CHARACTERS),
        clarification: "Which period?",
        reply: "today",
      }),
    ).toBeNull();
  });
});
