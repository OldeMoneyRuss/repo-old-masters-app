import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type ShippedEmailProps = {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  trackingCarrier: string;
  estimatedDelivery: string;
  orderUrl: string;
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

const sectionLabel = {
  color: "#6b7280",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: 4,
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const trackingBoxStyle = {
  backgroundColor: "#f3f4f6",
  borderRadius: 8,
  padding: "16px 20px",
  marginTop: 8,
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

export default function ShippedEmail({
  customerName,
  orderNumber,
  trackingNumber,
  trackingCarrier,
  estimatedDelivery,
  orderUrl,
}: ShippedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order #{orderNumber} has shipped</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={{ fontSize: 24, marginBottom: 8 }}>
            Your prints are on their way.
          </Heading>
          <Text style={{ color: "#374151" }}>
            Hi {customerName}, order <strong>#{orderNumber}</strong> has been
            handed off to the carrier.
          </Text>

          <Section style={{ marginTop: 24 }}>
            <Text style={sectionLabel}>Tracking</Text>
            <Section style={trackingBoxStyle}>
              <Text style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                {trackingCarrier}
              </Text>
              <Text
                style={{
                  margin: "4px 0 0 0",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  letterSpacing: "0.04em",
                }}
              >
                {trackingNumber}
              </Text>
            </Section>
          </Section>

          <Section style={{ marginTop: 20 }}>
            <Text style={sectionLabel}>Estimated delivery</Text>
            <Text style={{ margin: 0, fontSize: 16 }}>{estimatedDelivery}</Text>
          </Section>

          <Section style={{ marginTop: 28 }}>
            <Button href={orderUrl} style={buttonStyle}>
              View order
            </Button>
          </Section>

          <Hr style={hrStyle} />

          <Text style={mutedText}>
            Questions? Email us at hello@oldmastersprintshop.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
