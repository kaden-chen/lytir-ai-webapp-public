import { Anchor, Typography } from "@mantine/core";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Model output is untrusted presentation content. Three things keep it safe,
// and all three are deliberate:
//
// - Raw HTML is never rendered. `react-markdown` parses Markdown to React
//   elements and ignores embedded HTML unless a plugin is added to allow it.
//   No such plugin is used here, and none should be.
// - Link targets pass through the library's default URL handling, which strips
//   dangerous schemes such as `javascript:`.
// - Images are not fetched. A generated image URL would make the reader's
//   browser call an address the model chose, so the alternative text is shown
//   instead.
const COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <Anchor href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </Anchor>
  ),
  img: ({ alt }: { alt?: string }) => <span>{alt}</span>,
};

export function SafeMarkdown({ children }: { children: string }) {
  return (
    // Gives generated headings, lists, and tables sensible typography without
    // styling each element by hand.
    <Typography m={0} p={0}>
      {/* Tables and strikethrough are the GitHub extensions the answers use. */}
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </Markdown>
    </Typography>
  );
}
