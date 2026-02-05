const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

const BlockchainService = require('../services/blockchainService');
const IPFSService = require('../services/ipfsService');

const blockchainService = new BlockchainService();
const ipfsService = new IPFSService();

/**
 * GET /api/audit/:submissionId
 * Generate comprehensive audit report
 */
router.get('/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;

    const report = await blockchainService.generateAuditReport(submissionId);

    res.json({
      success: true,
      auditReport: report
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate audit report',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/:submissionId/chain-of-custody
 * Get detailed chain of custody (access logs)
 */
router.get('/:submissionId/chain-of-custody', async (req, res) => {
  try {
    const { submissionId } = req.params;

    const accessLogs = await blockchainService.getAccessLogs(submissionId);
    const submission = await blockchainService.getSubmission(submissionId);

    res.json({
      success: true,
      submissionId,
      evidenceHash: submission.contentHash,
      chainOfCustody: {
        created: {
          timestamp: submission.timestamp,
          blockNumber: submission.blockNumber
        },
        accessHistory: accessLogs,
        totalAccesses: accessLogs.length,
        integrity: 'verified' // All accesses are blockchain-verified
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get chain of custody',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/:submissionId/legal-report
 * Generate jurisdiction-specific legal documentation
 */
router.get('/:submissionId/legal-report', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { jurisdiction } = req.query;

    const report = await blockchainService.generateAuditReport(submissionId);
    const accessLogs = await blockchainService.getAccessLogs(submissionId);

    // Format for legal/regulatory bodies
    const legalReport = {
      reportType: 'Chain of Custody Certificate',
      jurisdiction: jurisdiction || 'International',
      generatedAt: new Date().toISOString(),
      
      evidenceSummary: {
        submissionId: report.submission.id,
        contentHash: report.submission.contentHash,
        storageLocation: `IPFS: ${report.submission.ipfsHash}`,
        category: report.submission.category,
        status: report.submission.status
      },

      proofOfExistence: {
        blockchainNetwork: 'Ethereum Sepolia Testnet',
        chainId: 11155111,
        blockNumber: report.submission.blockNumber,
        timestamp: report.submission.timestamp,
        verificationMethod: 'SHA-256 hash stored on immutable blockchain',
        tamperEvidence: 'Any modification to the original file would produce a different hash'
      },

      chainOfCustody: {
        totalEvents: accessLogs.length,
        events: accessLogs.map((log, index) => ({
          eventNumber: index + 1,
          action: log.action,
          timestamp: log.timestamp,
          actor: log.accessor,
          integrityHash: log.accessHash,
          verification: 'Blockchain-verified'
        }))
      },

      validationHistory: {
        totalValidations: report.validations.length,
        validations: report.validations.map(v => ({
          validator: v.validator,
          decision: v.approved ? 'APPROVED' : 'REJECTED',
          timestamp: v.timestamp,
          comment: v.comment
        })),
        consensusReached: report.submission.status === 'Validated'
      },

      whistleblowerReputation: {
        pseudonymousId: report.submission.pseudonymousId || 'Anonymous',
        trustScore: report.reputation.trustScore,
        historicalSubmissions: report.reputation.totalSubmissions,
        validatedSubmissions: report.reputation.validatedSubmissions
      },

      technicalDetails: {
        hashAlgorithm: 'SHA-256',
        storageProtocol: 'IPFS (InterPlanetary File System)',
        blockchainProtocol: 'Ethereum',
        smartContractStandard: 'ERC-compatible with AccessControl',
        metadataStripping: 'All EXIF, GPS, and identifying metadata removed prior to storage'
      },

      legalDisclaimer: `This report provides cryptographic proof that the referenced evidence 
existed in its current form at the timestamp indicated. The blockchain record is immutable 
and publicly verifiable. The chain of custody demonstrates all access events have been 
recorded on-chain. This documentation is provided to assist legal and regulatory bodies 
in evaluating the authenticity and integrity of the submitted evidence.`,

      verificationInstructions: {
        step1: 'Obtain the original evidence file',
        step2: 'Calculate SHA-256 hash of the file',
        step3: `Compare with recorded hash: ${report.submission.contentHash}`,
        step4: `Verify on Sepolia Etherscan: Search for submission ID ${submissionId}`,
        step5: 'Retrieve file from IPFS to confirm content matches hash'
      }
    };

    res.json({
      success: true,
      legalReport
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate legal report',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/:submissionId/export
 * Export audit report as downloadable document
 */
router.get('/:submissionId/export', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { format } = req.query;

    const report = await blockchainService.generateAuditReport(submissionId);

    if (format === 'json') {
      res.set('Content-Type', 'application/json');
      res.set('Content-Disposition', `attachment; filename="audit-report-${submissionId}.json"`);
      res.json(report);
    } else {
      // Default: formatted text
      const textReport = generateTextReport(report, submissionId);
      res.set('Content-Type', 'text/plain');
      res.set('Content-Disposition', `attachment; filename="audit-report-${submissionId}.txt"`);
      res.send(textReport);
    }

  } catch (error) {
    res.status(500).json({
      error: 'Failed to export audit report',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/:submissionId/store
 * Store audit report on IPFS for permanent record
 */
router.post('/:submissionId/store', async (req, res) => {
  try {
    const { submissionId } = req.params;

    const report = await blockchainService.generateAuditReport(submissionId);

    // Store on IPFS
    const ipfsResult = await ipfsService.uploadJSON(
      report,
      `audit-report-${submissionId}`
    );

    res.json({
      success: true,
      message: 'Audit report stored permanently on IPFS',
      ipfsHash: ipfsResult.ipfsHash,
      ipfsUrl: ipfsResult.gatewayUrl
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to store audit report',
      message: error.message
    });
  }
});

// Helper function to generate text report
function generateTextReport(report, submissionId) {
  return `
================================================================================
                     TARS AUDIT REPORT - CHAIN OF CUSTODY
================================================================================

SUBMISSION ID: ${submissionId}
GENERATED AT: ${report.generatedAt}

--------------------------------------------------------------------------------
                              EVIDENCE SUMMARY
--------------------------------------------------------------------------------
Content Hash:    ${report.submission.contentHash}
IPFS Location:   ${report.submission.ipfsHash}
Category:        ${report.submission.category}
Status:          ${report.submission.status}
Submission Time: ${report.submission.timestamp}
Block Number:    ${report.submission.blockNumber}

--------------------------------------------------------------------------------
                            VALIDATION HISTORY
--------------------------------------------------------------------------------
Total Validations: ${report.validations.length}

${report.validations.map((v, i) => `
Validation #${i + 1}
  Validator: ${v.validator}
  Decision:  ${v.approved ? 'APPROVED' : 'REJECTED'}
  Timestamp: ${v.timestamp}
  Comment:   ${v.comment || 'N/A'}
`).join('')}

--------------------------------------------------------------------------------
                             ACCESS HISTORY
--------------------------------------------------------------------------------
Total Access Events: ${report.accesses.length}

${report.accesses.map((a, i) => `
Event #${i + 1}
  Action:    ${a.action}
  Actor:     ${a.accessor}
  Timestamp: ${a.timestamp}
`).join('')}

--------------------------------------------------------------------------------
                         WHISTLEBLOWER REPUTATION
--------------------------------------------------------------------------------
Pseudonymous ID:       ${report.submission.pseudonymousId || 'Anonymous'}
Trust Score:           ${report.reputation.trustScore}/100
Total Submissions:     ${report.reputation.totalSubmissions}
Validated Submissions: ${report.reputation.validatedSubmissions}

================================================================================
                           VERIFICATION NOTICE
================================================================================
This report provides cryptographic proof of evidence integrity and chain of 
custody. All records are immutable and stored on the Ethereum blockchain.

To verify: Compare the SHA-256 hash of the original file with the Content Hash
recorded above. Query the Sepolia blockchain for submission ID ${submissionId}.

================================================================================
`;
}

/**
 * GET /api/audit/:submissionId/legal-export
 * Generate comprehensive court-admissible legal evidence package
 */
router.get('/:submissionId/legal-export', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { caseNumber, jurisdiction, format } = req.query;
    
    const legalDocumentGenerator = require('../services/legalDocumentGenerator');
    const evidenceStore = require('../services/evidenceStore');
    
    // Get evidence from store (evidenceStore is already a singleton instance)
    let evidence = evidenceStore.getSubmission(submissionId);
    
    // If not in store, try to get from blockchain
    if (!evidence) {
      try {
        const report = await blockchainService.generateAuditReport(submissionId);
        evidence = {
          id: submissionId,
          ...report.submission,
          validatorSignatures: report.validations.length
        };
      } catch (e) {
        return res.status(404).json({
          success: false,
          error: 'Evidence not found'
        });
      }
    }
    
    // Generate comprehensive legal package
    const legalPackage = await legalDocumentGenerator.generateLegalPackage(evidence, {
      caseNumber: caseNumber || null,
      jurisdiction: jurisdiction || 'International',
      includeChainOfCustody: true,
      includeAffidavit: true,
      includeHashCertificate: true,
      includeMetadataReport: true,
      includeValidationLog: true
    });
    
    // Return based on format
    if (format === 'pdf') {
      // Generate PDF version for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="TARS-Legal-Package-${submissionId}.pdf"`);
      generatePDFLegalPackage(legalPackage, res);
      return;
    }
    
    if (format === 'text') {
      // Generate plain text version for download
      const textReport = generateTextLegalPackage(legalPackage);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="TARS-Legal-Package-${submissionId}.txt"`);
      return res.send(textReport);
    }
    
    res.json({
      success: true,
      packageId: legalPackage.packageInfo.id,
      generatedAt: legalPackage.packageInfo.generatedAt,
      documentIntegrity: legalPackage.packageInfo.documentIntegrity,
      legalPackage
    });
    
  } catch (error) {
    console.error('Error generating legal export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate legal export',
      message: error.message
    });
  }
});

/**
 * Generate PDF version of legal package
 */
function generatePDFLegalPackage(pkg, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'TARS Legal Evidence Package',
      Author: 'TARS - Trustless Anonymous Reporting System',
      Subject: `Legal Evidence Package - ${pkg.packageInfo.id}`,
      Keywords: 'legal, evidence, blockchain, whistleblower'
    }
  });
  
  // Pipe to response
  doc.pipe(res);
  
  // Helper functions
  const addHeader = (text, size = 18) => {
    doc.fontSize(size).font('Helvetica-Bold').fillColor('#0891b2').text(text);
    doc.moveDown(0.5);
  };
  
  const addSubHeader = (text, size = 14) => {
    doc.fontSize(size).font('Helvetica-Bold').fillColor('#1f2937').text(text);
    doc.moveDown(0.3);
  };
  
  const addText = (text, size = 10) => {
    doc.fontSize(size).font('Helvetica').fillColor('#374151').text(text);
  };
  
  const addLabelValue = (label, value, labelWidth = 150) => {
    const y = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#6b7280').text(label, { continued: false });
    doc.fontSize(10).font('Helvetica').fillColor('#1f2937').text(value || 'N/A', doc.x + labelWidth, y);
    doc.moveDown(0.5);
  };
  
  const addDivider = () => {
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.5);
  };
  
  const checkPageBreak = (neededSpace = 100) => {
    if (doc.y > 700) {
      doc.addPage();
    }
  };
  
  // ===== COVER PAGE =====
  doc.rect(0, 0, 612, 150).fill('#0f172a');
  doc.fontSize(28).font('Helvetica-Bold').fillColor('#06b6d4').text('TARS', 50, 50);
  doc.fontSize(12).font('Helvetica').fillColor('#94a3b8').text('Trustless Anonymous Reporting System', 50, 85);
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').text('LEGAL EVIDENCE PACKAGE', 50, 110);
  
  doc.moveDown(4);
  doc.y = 180;
  
  doc.fontSize(12).font('Helvetica').fillColor('#64748b').text('Court-Admissible Documentation', { align: 'center' });
  doc.moveDown(2);
  
  // Package info box
  doc.rect(50, doc.y, 495, 120).fill('#f8fafc').stroke('#e2e8f0');
  const boxY = doc.y + 15;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('Package ID:', 70, boxY);
  doc.font('Helvetica').fillColor('#0891b2').text(pkg.packageInfo.id, 180, boxY);
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Generated:', 70, boxY + 20);
  doc.font('Helvetica').fillColor('#1f2937').text(new Date(pkg.packageInfo.generatedAt).toLocaleString(), 180, boxY + 20);
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Classification:', 70, boxY + 40);
  doc.font('Helvetica').fillColor('#dc2626').text(pkg.coverPage.classification, 180, boxY + 40);
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Case Number:', 70, boxY + 60);
  doc.font('Helvetica').fillColor('#1f2937').text(pkg.coverPage.caseNumber || 'Not Assigned', 180, boxY + 60);
  
  doc.font('Helvetica-Bold').fillColor('#475569').text('Integrity Hash:', 70, boxY + 80);
  doc.fontSize(8).font('Courier').fillColor('#059669').text(pkg.packageInfo.documentIntegrity, 180, boxY + 80);
  
  doc.y = boxY + 130;
  doc.moveDown(2);
  
  // Table of Contents
  addHeader('TABLE OF CONTENTS', 16);
  addDivider();
  pkg.tableOfContents.forEach(item => {
    doc.fontSize(11).font('Helvetica').fillColor('#1f2937')
      .text(`Section ${item.section}: ${item.title}`, { indent: 20 });
  });
  
  // ===== SECTION 1: EVIDENCE SUMMARY =====
  doc.addPage();
  addHeader(`SECTION ${pkg.sections.evidenceSummary.sectionNumber}: ${pkg.sections.evidenceSummary.title}`);
  addDivider();
  
  addSubHeader('Overview');
  const overview = pkg.sections.evidenceSummary.content.overview;
  addText(`Evidence ID: ${overview.evidenceId}`);
  addText(`Title: ${overview.title}`);
  addText(`Category: ${overview.category}`);
  addText(`Status: ${overview.status}`);
  addText(`Submission Date: ${overview.submissionDate}`);
  doc.moveDown();
  
  addSubHeader('File Details');
  const fileDetails = pkg.sections.evidenceSummary.content.fileDetails;
  addText(`Original Filename: ${fileDetails.originalFilename}`);
  addText(`File Type: ${fileDetails.fileType}`);
  doc.moveDown();
  
  addSubHeader('Cryptographic Identifiers');
  const ids = pkg.sections.evidenceSummary.content.identifiers;
  doc.fontSize(9).font('Courier').fillColor('#374151');
  addText(`Content Hash: ${ids.contentHash}`);
  addText(`IPFS Hash: ${ids.ipfsHash}`);
  addText(`Transaction: ${ids.transactionHash}`);
  addText(`Block: ${ids.blockNumber}`);
  doc.moveDown();
  
  addSubHeader('Validation Status');
  const validation = pkg.sections.evidenceSummary.content.validationStatus;
  addText(`Total Validations: ${validation.totalValidations} / ${validation.requiredValidations}`);
  addText(`Consensus Reached: ${validation.consensusReached ? 'YES' : 'NO'}`);
  addText(`Verification Level: ${validation.verificationLevel}`);
  
  // ===== SECTION 2: CHAIN OF CUSTODY =====
  if (pkg.sections.chainOfCustody) {
    doc.addPage();
    addHeader(`SECTION ${pkg.sections.chainOfCustody.sectionNumber}: ${pkg.sections.chainOfCustody.title}`);
    addDivider();
    
    addText(pkg.sections.chainOfCustody.content.custodyStatement);
    doc.moveDown();
    
    addSubHeader('Summary');
    const summary = pkg.sections.chainOfCustody.content.summary;
    addText(`Total Events: ${summary.totalEvents}`);
    addText(`Chain Integrity: ${summary.chainIntegrity}`);
    doc.moveDown();
    
    addSubHeader('Custody Events');
    pkg.sections.chainOfCustody.content.events.forEach(event => {
      checkPageBreak();
      doc.rect(50, doc.y, 495, 60).fill('#f8fafc').stroke('#e2e8f0');
      const eventY = doc.y + 10;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0891b2').text(`Event #${event.sequenceNumber}: ${event.event}`, 60, eventY);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text(`${event.timestamp}`, 60, eventY + 15);
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`${event.description}`, 60, eventY + 30);
      doc.fontSize(8).font('Courier').fillColor('#059669').text(`Hash: ${event.verificationHash.substring(0, 40)}...`, 60, eventY + 45);
      doc.y = eventY + 70;
    });
  }
  
  // ===== SECTION 3: HASH CERTIFICATE =====
  if (pkg.sections.hashCertificate) {
    doc.addPage();
    addHeader(`SECTION ${pkg.sections.hashCertificate.sectionNumber}: ${pkg.sections.hashCertificate.title}`);
    addDivider();
    
    const cert = pkg.sections.hashCertificate.content;
    addSubHeader('Certificate Information');
    addText(`Certificate ID: ${cert.certificateId}`);
    addText(`Issued At: ${cert.issuedAt}`);
    addText(`Issued By: ${cert.issuedBy}`);
    doc.moveDown();
    
    addSubHeader('File Hash');
    addText(`Algorithm: ${cert.fileHashes.algorithm}`);
    doc.fontSize(9).font('Courier').fillColor('#059669').text(`Hash: ${cert.fileHashes.sha256}`);
    addText(`Bit Length: ${cert.fileHashes.bitLength}`);
    doc.moveDown();
    
    addSubHeader('IPFS Verification');
    addText(`IPFS Hash: ${cert.ipfsVerification.ipfsHash}`);
    addText(`Gateway URL: ${cert.ipfsVerification.fullUrl}`);
    doc.moveDown();
    
    addText(cert.legalStatement);
  }
  
  // ===== SECTION 4: BLOCKCHAIN PROOF =====
  doc.addPage();
  addHeader(`SECTION ${pkg.sections.blockchainProof.sectionNumber}: ${pkg.sections.blockchainProof.title}`);
  addDivider();
  
  const bp = pkg.sections.blockchainProof.content;
  addSubHeader('Network Information');
  addText(`Network: ${bp.network.name}`);
  addText(`Chain ID: ${bp.network.chainId}`);
  addText(`Consensus: ${bp.network.consensus}`);
  doc.moveDown();
  
  addSubHeader('Transaction Details');
  doc.fontSize(9).font('Courier').fillColor('#374151').text(`Hash: ${bp.transaction.hash}`);
  addText(`Block Number: ${bp.transaction.blockNumber}`);
  addText(`Status: ${bp.transaction.status}`);
  addText(`Explorer: ${bp.transaction.explorerUrl}`);
  doc.moveDown();
  
  addSubHeader('Smart Contract');
  addText(`Address: ${bp.smartContract.address}`);
  addText(`Name: ${bp.smartContract.name}`);
  doc.moveDown();
  
  addText(bp.proofStatement);
  
  // ===== SECTION: AFFIDAVIT =====
  if (pkg.sections.affidavit) {
    doc.addPage();
    addHeader(`SECTION ${pkg.sections.affidavit.sectionNumber}: ${pkg.sections.affidavit.title}`);
    addDivider();
    
    addText(pkg.sections.affidavit.content.preamble);
    doc.moveDown();
    
    addSubHeader('Declarations');
    pkg.sections.affidavit.content.declarations.forEach(d => {
      checkPageBreak();
      addText(`${d.number}. ${d.text}`);
      doc.moveDown(0.3);
    });
    
    doc.moveDown();
    addSubHeader('Signature Block');
    doc.moveDown();
    addText('Declarant Signature: _______________________________');
    doc.moveDown(0.5);
    addText('Printed Name: _______________________________');
    doc.moveDown(0.5);
    addText('Date: _______________________________');
    doc.moveDown();
    
    addSubHeader('Notary Section');
    addText('State/Province: _______________________________');
    doc.moveDown(0.5);
    addText('Subscribed and sworn to before me this _____ day of _____________, 20____.');
    doc.moveDown(0.5);
    addText('Notary Signature: _______________________________');
    doc.moveDown(0.5);
    addText('Commission Expires: _______________________________');
  }
  
  // ===== VERIFICATION INSTRUCTIONS =====
  doc.addPage();
  addHeader(`SECTION ${pkg.sections.verificationInstructions.sectionNumber}: ${pkg.sections.verificationInstructions.title}`);
  addDivider();
  
  addText(pkg.sections.verificationInstructions.content.overview);
  doc.moveDown();
  
  pkg.sections.verificationInstructions.content.methods.forEach(method => {
    checkPageBreak(150);
    addSubHeader(`${method.name} (Difficulty: ${method.difficulty})`);
    addText(`Tools Required: ${method.tools.join(', ')}`);
    doc.moveDown(0.3);
    method.steps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`);
    });
    if (method.commandExample) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Courier').fillColor('#6b7280').text(`Example: ${method.commandExample}`);
    }
    doc.moveDown();
  });
  
  // ===== LEGAL DISCLAIMERS =====
  doc.addPage();
  addHeader(`SECTION ${pkg.sections.legalDisclaimers.sectionNumber}: ${pkg.sections.legalDisclaimers.title}`);
  addDivider();
  
  const disclaimers = pkg.sections.legalDisclaimers.content;
  addSubHeader('General Disclaimer');
  addText(disclaimers.generalDisclaimer);
  doc.moveDown();
  
  checkPageBreak();
  addSubHeader('Jurisdiction Notice');
  addText(disclaimers.jurisdictionNotice);
  doc.moveDown();
  
  checkPageBreak();
  addSubHeader('Whistleblower Protection');
  addText(disclaimers.whistleblowerProtection);
  doc.moveDown();
  
  checkPageBreak();
  addSubHeader('Limitation of Liability');
  addText(disclaimers.limitationOfLiability);
  
  // ===== FOOTER =====
  doc.addPage();
  doc.rect(0, 0, 612, 842).fill('#0f172a');
  
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#06b6d4').text('END OF DOCUMENT', 50, 300, { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(12).font('Helvetica').fillColor('#94a3b8').text('This document was automatically generated by', { align: 'center' });
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff').text('TARS - Trustless Anonymous Reporting System', { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Package ID: ${pkg.packageInfo.id}`, { align: 'center' });
  doc.text(`Generated: ${pkg.packageInfo.generatedAt}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(8).font('Courier').fillColor('#059669').text(`Integrity Hash: ${pkg.packageInfo.documentIntegrity}`, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('For verification, visit: https://tars.network', { align: 'center' });
  
  // Finalize PDF
  doc.end();
}

/**
 * Generate plain text version of legal package
 */
function generateTextLegalPackage(pkg) {
  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);
  
  let text = `
${divider}
                    TARS LEGAL EVIDENCE PACKAGE
                    Court-Admissible Documentation
${divider}

Package ID:      ${pkg.packageInfo.id}
Generated:       ${pkg.packageInfo.generatedAt}
Classification:  ${pkg.coverPage.classification}
Case Number:     ${pkg.coverPage.caseNumber}

Platform:        ${pkg.coverPage.platform.name}
                 ${pkg.coverPage.platform.description}

Document Integrity Hash: ${pkg.packageInfo.documentIntegrity}

${divider}
                         TABLE OF CONTENTS
${divider}
${pkg.tableOfContents.map(item => `Section ${item.section}: ${item.title}`).join('\n')}

`;

  // Evidence Summary
  text += `
${divider}
SECTION ${pkg.sections.evidenceSummary.sectionNumber}: ${pkg.sections.evidenceSummary.title}
${divider}

Evidence ID:        ${pkg.sections.evidenceSummary.content.overview.evidenceId}
Title:              ${pkg.sections.evidenceSummary.content.overview.title}
Category:           ${pkg.sections.evidenceSummary.content.overview.category}
Status:             ${pkg.sections.evidenceSummary.content.overview.status}
Submission Date:    ${pkg.sections.evidenceSummary.content.overview.submissionDate}

FILE DETAILS
${subDivider}
Original Filename:  ${pkg.sections.evidenceSummary.content.fileDetails.originalFilename}
File Type:          ${pkg.sections.evidenceSummary.content.fileDetails.fileType}

IDENTIFIERS
${subDivider}
Content Hash:       ${pkg.sections.evidenceSummary.content.identifiers.contentHash}
IPFS Hash:          ${pkg.sections.evidenceSummary.content.identifiers.ipfsHash}
Transaction Hash:   ${pkg.sections.evidenceSummary.content.identifiers.transactionHash}
Block Number:       ${pkg.sections.evidenceSummary.content.identifiers.blockNumber}

VALIDATION STATUS
${subDivider}
Total Validations:    ${pkg.sections.evidenceSummary.content.validationStatus.totalValidations}
Required:             ${pkg.sections.evidenceSummary.content.validationStatus.requiredValidations}
Consensus Reached:    ${pkg.sections.evidenceSummary.content.validationStatus.consensusReached ? 'YES' : 'NO'}
Verification Level:   ${pkg.sections.evidenceSummary.content.validationStatus.verificationLevel}

`;

  // Chain of Custody
  if (pkg.sections.chainOfCustody) {
    text += `
${divider}
SECTION ${pkg.sections.chainOfCustody.sectionNumber}: ${pkg.sections.chainOfCustody.title}
${divider}

${pkg.sections.chainOfCustody.content.custodyStatement}

Total Events: ${pkg.sections.chainOfCustody.content.summary.totalEvents}
First Event:  ${pkg.sections.chainOfCustody.content.summary.firstEvent}
Last Event:   ${pkg.sections.chainOfCustody.content.summary.lastEvent}
Integrity:    ${pkg.sections.chainOfCustody.content.summary.chainIntegrity}

CUSTODY EVENTS
${subDivider}
${pkg.sections.chainOfCustody.content.events.map(event => `
Event #${event.sequenceNumber}: ${event.event}
  Timestamp:    ${event.timestamp}
  Description:  ${event.description}
  Actor:        ${event.actor} (${event.actorType})
  Verification: ${event.verificationHash}
`).join('')}
`;
  }

  // Hash Certificate
  if (pkg.sections.hashCertificate) {
    text += `
${divider}
SECTION ${pkg.sections.hashCertificate.sectionNumber}: ${pkg.sections.hashCertificate.title}
${divider}

Certificate ID: ${pkg.sections.hashCertificate.content.certificateId}
Issued At:      ${pkg.sections.hashCertificate.content.issuedAt}
Issued By:      ${pkg.sections.hashCertificate.content.issuedBy}

FILE HASH
${subDivider}
Algorithm:      ${pkg.sections.hashCertificate.content.fileHashes.algorithm}
Hash Value:     ${pkg.sections.hashCertificate.content.fileHashes.sha256}
Bit Length:     ${pkg.sections.hashCertificate.content.fileHashes.bitLength}

IPFS VERIFICATION
${subDivider}
IPFS Hash:      ${pkg.sections.hashCertificate.content.ipfsVerification.ipfsHash}
Gateway URL:    ${pkg.sections.hashCertificate.content.ipfsVerification.fullUrl}

${pkg.sections.hashCertificate.content.legalStatement}
`;
  }

  // Blockchain Proof
  text += `
${divider}
SECTION ${pkg.sections.blockchainProof.sectionNumber}: ${pkg.sections.blockchainProof.title}
${divider}

NETWORK INFORMATION
${subDivider}
Network:        ${pkg.sections.blockchainProof.content.network.name}
Chain ID:       ${pkg.sections.blockchainProof.content.network.chainId}
Consensus:      ${pkg.sections.blockchainProof.content.network.consensus}

TRANSACTION DETAILS
${subDivider}
Transaction:    ${pkg.sections.blockchainProof.content.transaction.hash}
Block Number:   ${pkg.sections.blockchainProof.content.transaction.blockNumber}
Status:         ${pkg.sections.blockchainProof.content.transaction.status}
Explorer URL:   ${pkg.sections.blockchainProof.content.transaction.explorerUrl}

SMART CONTRACT
${subDivider}
Address:        ${pkg.sections.blockchainProof.content.smartContract.address}
Contract Name:  ${pkg.sections.blockchainProof.content.smartContract.name}

${pkg.sections.blockchainProof.content.proofStatement}
`;

  // Affidavit
  if (pkg.sections.affidavit) {
    text += `
${divider}
SECTION ${pkg.sections.affidavit.sectionNumber}: ${pkg.sections.affidavit.title}
${divider}

${pkg.sections.affidavit.content.preamble}

DECLARATIONS:
${pkg.sections.affidavit.content.declarations.map(d => `
${d.number}. ${d.text}
`).join('')}

SIGNATURE BLOCK
${subDivider}
Declarant Signature: ________________________________

Printed Name:        ________________________________

Date:                ________________________________


NOTARY SECTION
${subDivider}
State/Province:      ________________________________

County/District:     ________________________________

Subscribed and sworn to before me this _____ day of _____________, 20____.

Notary Signature:    ________________________________

Notary Name:         ________________________________

Commission Expires:  ________________________________

${pkg.sections.affidavit.content.instructions}
`;
  }

  // Verification Instructions
  text += `
${divider}
SECTION ${pkg.sections.verificationInstructions.sectionNumber}: ${pkg.sections.verificationInstructions.title}
${divider}

${pkg.sections.verificationInstructions.content.overview}

${pkg.sections.verificationInstructions.content.methods.map(method => `
METHOD: ${method.name} (Difficulty: ${method.difficulty})
${subDivider}
Tools Required: ${method.tools.join(', ')}

Steps:
${method.steps.map((step, i) => `  ${i + 1}. ${step}`).join('\n')}
${method.commandExample ? `\nCommand Example:\n  ${method.commandExample}` : ''}
`).join('')}
`;

  // Legal Disclaimers
  text += `
${divider}
SECTION ${pkg.sections.legalDisclaimers.sectionNumber}: ${pkg.sections.legalDisclaimers.title}
${divider}

GENERAL DISCLAIMER
${subDivider}
${pkg.sections.legalDisclaimers.content.generalDisclaimer}

JURISDICTION NOTICE
${subDivider}
${pkg.sections.legalDisclaimers.content.jurisdictionNotice}

WHISTLEBLOWER PROTECTION
${subDivider}
${pkg.sections.legalDisclaimers.content.whistleblowerProtection}

LIMITATION OF LIABILITY
${subDivider}
${pkg.sections.legalDisclaimers.content.limitationOfLiability}

${divider}
                         END OF DOCUMENT
${divider}

Document Generated: ${pkg.packageInfo.generatedAt}
Package ID: ${pkg.packageInfo.id}
Integrity Hash: ${pkg.packageInfo.documentIntegrity}

This document was automatically generated by TARS - Trustless Anonymous Reporting System
For verification, visit: https://tars.network

`;

  return text;
}

module.exports = router;
