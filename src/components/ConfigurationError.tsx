import { Alert, Code, Container, List, Text } from "@mantine/core";

interface ConfigurationErrorProps {
  missing: readonly string[];
}

export function ConfigurationError({ missing }: ConfigurationErrorProps) {
  return (
    <Container size="sm" py="xl">
      <Alert color="red" title="Missing configuration">
        <Text size="sm">
          Copy <Code>.env.example</Code> to <Code>.env.local</Code>, set the
          following, and reload.
        </Text>
        <List mt="sm" size="sm">
          {missing.map((key) => (
            <List.Item key={key}>
              <Code>{key}</Code>
            </List.Item>
          ))}
        </List>
      </Alert>
    </Container>
  );
}
