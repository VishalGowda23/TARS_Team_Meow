import { chromium } from "playwright";
import Handlebars from "handlebars";
import QRCode from "qrcode";
import fs from "node:fs";
import path from "node:path";

/**
 * Generates a court-ready PDF audit report for a specific piece of evidence.
 */
export async function generateAuditPDF(evidenceData: any): Promise<Buffer> {
    try {
        const templatePath = path.join(process.cwd(), "templates", "audit_report.hbs");
        const templateHtml = fs.readFileSync(templatePath, "utf8");
        const template = Handlebars.compile(templateHtml);

        // Generate QR code for verification portal (placeholder URL)
        const verificationUrl = `https://tars-verify.dev/v/${evidenceData.id}`;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl);

        // Enrich data for template
        const enrichedData = {
            ...evidenceData,
            qrDataUrl,
            createdAt: evidenceData.createdAt ? new Date(evidenceData.createdAt).toLocaleString() : new Date().toLocaleString(),
            custodyEvents: (evidenceData.custodyEvents || []).map((e: any) => ({
                ...e,
                timestamp: new Date(e.timestamp).toLocaleString()
            }))
        };

        const html = template(enrichedData);

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html);

        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" },
            printBackground: true
        });

        await browser.close();
        return Buffer.from(pdfBuffer);
    } catch (error) {
        console.error("PDF generation error:", error);
        throw new Error("Failed to generate audit PDF");
    }
}
