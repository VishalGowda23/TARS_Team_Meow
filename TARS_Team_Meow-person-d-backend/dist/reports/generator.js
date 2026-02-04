"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuditPDF = generateAuditPDF;
const playwright_1 = require("playwright");
const handlebars_1 = __importDefault(require("handlebars"));
const qrcode_1 = __importDefault(require("qrcode"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
/**
 * Generates a court-ready PDF audit report for a specific piece of evidence.
 */
async function generateAuditPDF(evidenceData) {
    try {
        const templatePath = node_path_1.default.join(process.cwd(), "templates", "audit_report.hbs");
        const templateHtml = node_fs_1.default.readFileSync(templatePath, "utf8");
        const template = handlebars_1.default.compile(templateHtml);
        // Generate QR code for verification portal (placeholder URL)
        const verificationUrl = `https://tars-verify.dev/v/${evidenceData.id}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(verificationUrl);
        // Enrich data for template
        const enrichedData = {
            ...evidenceData,
            qrDataUrl,
            createdAt: evidenceData.createdAt ? new Date(evidenceData.createdAt).toLocaleString() : new Date().toLocaleString(),
            custodyEvents: (evidenceData.custodyEvents || []).map((e) => ({
                ...e,
                timestamp: new Date(e.timestamp).toLocaleString()
            }))
        };
        const html = template(enrichedData);
        const browser = await playwright_1.chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" },
            printBackground: true
        });
        await browser.close();
        return Buffer.from(pdfBuffer);
    }
    catch (error) {
        console.error("PDF generation error:", error);
        throw new Error("Failed to generate audit PDF");
    }
}
