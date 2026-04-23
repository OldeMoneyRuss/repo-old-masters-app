import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export type CancellationEmailProps = {
  customerName: string;
  orderNumber: string;
  refundAmountCents: number;
  refundTimeline: string;
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

const refundBoxStyle = {
  backgroundColor: "#f3f4f6",
  borderRadius: 8,
  padding: "16px 20px",
  marginTop: 8,
};

const mutedText = {
  color: "#6b7280",
  fontSize: 12,
};

export default function CancellationEmail({
  customerName,
  orderNumber,
  refundAmountCents,
  refundTimeline,
}: CancellationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order #{orderNumber} has been cancelled</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={{ fontSize: 24, marginBottom: 8 }}>
            Your order has been cancelled.
          </Heading>
          <Text style={{ color: "#374151" }}>
            Hi {customerName}, we&rsquo;ve cancelled order{" "}
            <strong>#{orderNumber}</strong> as requested. We&rsquo;re sorry to
            see it go.
          </Text>

          <Section style={{ marginTop: 24 }}>
            <Text style={sectionLabel}>Refund</Text>
            <Section style={refundBoxStyle}>
              <Text
                style={{ margin: 0, fontSize: 20, fontWeight: 600 }}
              >
                {formatCents(refundAmountCents)}
              </Text>
              <Text
                style={{
                  margin: "4px 0 0 0",
                  color: "#374151",
                  fontSize: 14,
                }}
              >
                Your refund of {formatCents(refundAmountCents)} will appear on
                your original payment method within {refundTimeline}.
              </Text>
            </Section>
          </Section>

          <Hr style={hrStyle} />

          <Text style={{ color: "#374151" }}>
            If this cancellation wasn&rsquo;t what you expected, or if you
            have questions about your refund, we&rsquo;re happy to help.
          </Text>

          <Text style={mutedText}>
            Contact us at hello@oldmastersprintshop.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
