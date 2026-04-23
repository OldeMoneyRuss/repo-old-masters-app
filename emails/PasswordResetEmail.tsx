import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type PasswordResetEmailProps = {
  name: string;
  resetUrl: string;
};

const bodyStyle = {
  fontFamily: "Georgia, serif",
  backgroundColor: "#fafafa",
  color: "#111827",
};

const containerStyle = {
  padding: "32px 24px",
  maxWidth: 560,
};

const buttonStyle = {
  backgroundColor: "#111827",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: 999,
  textDecoration: "none",
};

const mutedText = {
  color: "#6b7280",
  fontSize: 12,
};

export default function PasswordResetEmail({
  name,
  resetUrl,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Old Masters Print Shop password</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={{ fontSize: 24, marginBottom: 8 }}>
            Reset your password.
          </Heading>
          <Text style={{ color: "#374151" }}>
            Hi {name}, we received a request to reset your password. Click the
            button below to choose a new one &mdash; this link expires in 1
            hour.
          </Text>

          <Section style={{ marginTop: 24 }}>
            <Button href={resetUrl} style={buttonStyle}>
              Reset password
            </Button>
          </Section>

          <Text style={{ marginTop: 24, color: "#374151", fontSize: 13 }}>
            Or copy and paste this link into your browser:
          </Text>
          <Text
            style={{
              margin: 0,
              color: "#374151",
              fontSize: 12,
              wordBreak: "break-all",
            }}
          >
            {resetUrl}
          </Text>

          <Text style={{ marginTop: 32, ...mutedText }}>
            If you didn&rsquo;t request this, you can safely ignore this email
            &mdash; your password will not change.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
