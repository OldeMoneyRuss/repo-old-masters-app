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

type Props = {
  name: string;
  verifyUrl: string;
};

export default function VerificationEmail({ name, verifyUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email to finish creating your account</Preview>
      <Body style={{ fontFamily: "Georgia, serif", backgroundColor: "#fafafa" }}>
        <Container style={{ padding: "32px 24px", maxWidth: 560 }}>
          <Heading style={{ fontSize: 24 }}>Welcome, {name}.</Heading>
          <Text>
            Please confirm this is your email address so we can finish creating
            your account at Old Masters Print Shop. This link expires in 24
            hours.
          </Text>
          <Section style={{ marginTop: 24 }}>
            <Button
              href={verifyUrl}
              style={{
                backgroundColor: "#111827",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              Verify email
            </Button>
          </Section>
          <Text style={{ marginTop: 32, color: "#6b7280", fontSize: 12 }}>
            If you didn&rsquo;t create this account, you can safely ignore this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
