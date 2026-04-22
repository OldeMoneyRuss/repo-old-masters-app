import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

const PAPER_NAMES: Record<string, string> = {
  archival_matte: "Premium Matte",
  lustre: "Lustre",
  fine_art_cotton: "Cotton Rag",
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export type OrderConfirmationEmailProps = {
  orderNumber: string;
  customerName: string;
  items: Array<{
    title: string;
    artistName: string | null;
    printSize: string;
    paperType: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode: string;
    country: string;
  };
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

const mutedText = {
  color: "#6b7280",
  fontSize: 12,
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

const buttonStyle = {
  backgroundColor: "#111827",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: 999,
  textDecoration: "none",
};

export default function OrderConfirmationEmail({
  orderNumber,
  customerName,
  items,
  subtotalCents,
  shippingCents,
  taxCents,
  totalCents,
  shippingAddress,
  orderUrl,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Order confirmed — #{orderNumber}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={{ fontSize: 24, marginBottom: 8 }}>
            Thank you for your order.
          </Heading>
          <Text style={{ color: "#374151" }}>
            Hi {customerName}, we&rsquo;ve received your order and begun
            preparing your prints.
          </Text>

          <Section style={{ marginTop: 24 }}>
            <Text style={sectionLabel}>Order number</Text>
            <Text style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
              #{orderNumber}
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section>
            <Text style={sectionLabel}>Order summary</Text>
            {items.map((item, idx) => {
              const paperLabel = PAPER_NAMES[item.paperType] ?? item.paperType;
              const lineTotal = item.unitPriceCents * item.quantity;
              return (
                <Row
                  key={`${item.title}-${idx}`}
                  style={{ marginBottom: 12 }}
                >
                  <Column>
                    <Text
                      style={{ margin: 0, fontSize: 15, fontWeight: 600 }}
                    >
                      {item.title}
                    </Text>
                    {item.artistName ? (
                      <Text
                        style={{
                          margin: 0,
                          color: "#6b7280",
                          fontSize: 13,
                        }}
                      >
                        {item.artistName}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        margin: 0,
                        color: "#6b7280",
                        fontSize: 13,
                      }}
                    >
                      {item.printSize} &middot; {paperLabel} &middot; Qty{" "}
                      {item.quantity}
                    </Text>
                  </Column>
                  <Column align="right" style={{ verticalAlign: "top" }}>
                    <Text style={{ margin: 0, fontSize: 15 }}>
                      {formatCents(lineTotal)}
                    </Text>
                  </Column>
                </Row>
              );
            })}
          </Section>

          <Hr style={hrStyle} />

          <Section>
            <Row>
              <Column>
                <Text style={{ margin: 0, color: "#6b7280" }}>Subtotal</Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: 0 }}>{formatCents(subtotalCents)}</Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={{ margin: "4px 0", color: "#6b7280" }}>
                  Shipping
                </Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: "4px 0" }}>
                  {formatCents(shippingCents)}
                </Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={{ margin: "4px 0", color: "#6b7280" }}>Tax</Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: "4px 0" }}>{formatCents(taxCents)}</Text>
              </Column>
            </Row>
            <Row style={{ marginTop: 8 }}>
              <Column>
                <Text style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>
                  Total
                </Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>
                  {formatCents(totalCents)}
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hrStyle} />

          <Section>
            <Text style={sectionLabel}>Production &amp; shipping</Text>
            <Text style={{ margin: "4px 0", color: "#374151" }}>
              Your prints will be ready in 3&ndash;5 business days, then
              shipped.
            </Text>
          </Section>

          <Section style={{ marginTop: 16 }}>
            <Text style={sectionLabel}>Shipping to</Text>
            <Text style={{ margin: 0 }}>{shippingAddress.fullName}</Text>
            <Text style={{ margin: 0 }}>{shippingAddress.line1}</Text>
            {shippingAddress.line2 ? (
              <Text style={{ margin: 0 }}>{shippingAddress.line2}</Text>
            ) : null}
            <Text style={{ margin: 0 }}>
              {shippingAddress.city}
              {shippingAddress.region ? `, ${shippingAddress.region}` : ""}{" "}
              {shippingAddress.postalCode}
            </Text>
            <Text style={{ margin: 0 }}>{shippingAddress.country}</Text>
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
