import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const itemId = req.nextUrl.searchParams.get("item");

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const itemWhere = itemId
    ? and(eq(orderItems.orderId, id), eq(orderItems.id, itemId))
    : eq(orderItems.orderId, id);

  const items = await db.select().from(orderItems).where(itemWhere);
  if (!items.length) {
    return NextResponse.json({ error: "No items found." }, { status: 404 });
  }

  // Generate one PDF with one page per line item
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const item of items) {
    const page = doc.addPage([612, 396]); // landscape half-letter
    const { width, height } = page.getSize();
    const margin = 40;

    // Header bar
    page.drawRectangle({
      x: 0,
      y: height - 60,
      width,
      height: 60,
      color: rgb(0.07, 0.07, 0.07),
    });

    page.drawText("PRINT JOB TICKET", {
      x: margin,
      y: height - 38,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Order #${order.orderNumber}`, {
      x: width - margin - 160,
      y: height - 38,
      size: 12,
      font,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Body fields
    const fields: [string, string][] = [
      ["Order ID", order.id],
      ["Order #", order.orderNumber],
      ["Artwork", item.artworkTitle],
      ["Artist", item.artistName ?? "—"],
      ["Print size", item.printSize],
      ["Paper type", item.paperType.replace(/_/g, " ")],
      ["Border treatment", item.borderTreatment],
      ["Quantity", String(item.quantity)],
    ];

    const labelX = margin;
    const valueX = 180;
    let y = height - 90;
    const lineHeight = 26;

    for (const [label, value] of fields) {
      page.drawText(label.toUpperCase(), {
        x: labelX,
        y,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(value, {
        x: valueX,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.07, 0.07, 0.07),
      });
      y -= lineHeight;
    }

    // Footer
    page.drawText(`Generated ${new Date().toLocaleString()}`, {
      x: margin,
      y: 16,
      size: 8,
      font,
      color: rgb(0.65, 0.65, 0.65),
    });
  }

  const pdfBytes = await doc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-${order.orderNumber}.pdf"`,
    },
  });
}
