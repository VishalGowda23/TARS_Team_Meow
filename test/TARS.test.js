const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TARS Contract", function () {
  let tars;
  let tarsToken;
  let owner;
  let validator1;
  let validator2;
  let validator3;
  let whistleblower;

  const sampleContentHash = ethers.keccak256(ethers.toUtf8Bytes("sample evidence content"));
  const sampleIpfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  const sampleCategory = "corporate";
  const sampleMetadataHash = "QmMetadataHash123";

  beforeEach(async function () {
    [owner, validator1, validator2, validator3, whistleblower] = await ethers.getSigners();

    // Deploy TARS Token
    const TARSToken = await ethers.getContractFactory("TARSToken");
    tarsToken = await TARSToken.deploy();
    await tarsToken.waitForDeployment();

    // Deploy TARS
    const TARS = await ethers.getContractFactory("TARS");
    tars = await TARS.deploy();
    await tars.waitForDeployment();

    // Add validators
    await tars.addValidator(validator1.address);
    await tars.addValidator(validator2.address);
    await tars.addValidator(validator3.address);
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      const DEFAULT_ADMIN_ROLE = await tars.DEFAULT_ADMIN_ROLE();
      expect(await tars.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set the deployer as validator", async function () {
      const VALIDATOR_ROLE = await tars.VALIDATOR_ROLE();
      expect(await tars.hasRole(VALIDATOR_ROLE, owner.address)).to.be.true;
    });

    it("Should have correct initial validator threshold", async function () {
      expect(await tars.validatorThreshold()).to.equal(2);
    });
  });

  describe("Evidence Submission", function () {
    it("Should submit evidence successfully", async function () {
      const tx = await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const submission = await tars.getSubmission(1);
      expect(submission.contentHash).to.equal(sampleContentHash);
      expect(submission.ipfsHash).to.equal(sampleIpfsHash);
      expect(submission.category).to.equal(sampleCategory);
      expect(submission.status).to.equal(0); // Pending
    });

    it("Should emit SubmissionCreated event", async function () {
      await expect(tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      ))
        .to.emit(tars, "SubmissionCreated")
        .withArgs(1, sampleContentHash, sampleIpfsHash, expect.anything(), sampleCategory);
    });

    it("Should reject duplicate evidence", async function () {
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );

      await expect(tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      )).to.be.revertedWith("Evidence already submitted");
    });

    it("Should update whistleblower reputation on submission", async function () {
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );

      const rep = await tars.getReputation(whistleblower.address);
      expect(rep.totalSubmissions).to.equal(1);
    });
  });

  describe("Evidence Validation", function () {
    beforeEach(async function () {
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );
    });

    it("Should allow validators to validate evidence", async function () {
      await tars.connect(validator1).validateEvidence(1, true, "Looks authentic");

      const submission = await tars.getSubmission(1);
      expect(submission.validationCount).to.equal(1);
      expect(submission.status).to.equal(1); // UnderReview
    });

    it("Should reach consensus and validate", async function () {
      await tars.connect(validator1).validateEvidence(1, true, "Approved");
      await tars.connect(validator2).validateEvidence(1, true, "Confirmed");

      const submission = await tars.getSubmission(1);
      expect(submission.status).to.equal(2); // Validated
    });

    it("Should reach consensus and reject", async function () {
      await tars.connect(validator1).validateEvidence(1, false, "Suspicious");
      await tars.connect(validator2).validateEvidence(1, false, "Cannot verify");

      const submission = await tars.getSubmission(1);
      expect(submission.status).to.equal(3); // Rejected
    });

    it("Should prevent double validation by same validator", async function () {
      await tars.connect(validator1).validateEvidence(1, true, "Approved");

      await expect(tars.connect(validator1).validateEvidence(1, true, "Approved again"))
        .to.be.revertedWith("Already validated");
    });

    it("Should record validation history", async function () {
      await tars.connect(validator1).validateEvidence(1, true, "Looks good");

      const history = await tars.getValidationHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].validator).to.equal(validator1.address);
      expect(history[0].approved).to.be.true;
    });
  });

  describe("Proof of Existence", function () {
    beforeEach(async function () {
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );
    });

    it("Should verify existing evidence", async function () {
      const result = await tars.verifyProofOfExistence(sampleContentHash);
      expect(result.exists).to.be.true;
      expect(result.submissionId).to.equal(1);
    });

    it("Should not verify non-existent evidence", async function () {
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake content"));
      const result = await tars.verifyProofOfExistence(fakeHash);
      expect(result.exists).to.be.false;
    });
  });

  describe("Selective Disclosure", function () {
    beforeEach(async function () {
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );

      // Validate the evidence
      await tars.connect(validator1).validateEvidence(1, true, "OK");
      await tars.connect(validator2).validateEvidence(1, true, "OK");
    });

    it("Should authorize viewer", async function () {
      await tars.connect(whistleblower).authorizeViewer(1, validator3.address);

      expect(await tars.authorizedViewers(1, validator3.address)).to.be.true;
    });

    it("Should release evidence to public", async function () {
      await tars.connect(whistleblower).releaseEvidence(1);

      const submission = await tars.getSubmission(1);
      expect(submission.isPublic).to.be.true;
      expect(submission.status).to.equal(4); // Released
    });
  });

  describe("Access Logging (Chain of Custody)", function () {
    beforeEach(async function () {
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );

      await tars.connect(validator1).validateEvidence(1, true, "OK");
      await tars.connect(validator2).validateEvidence(1, true, "OK");
      await tars.connect(whistleblower).releaseEvidence(1);
    });

    it("Should log access events", async function () {
      await tars.logEvidenceAccess(1, "view");

      const logs = await tars.getAccessLogs(1);
      // Should have: submit, 2 validations, release, view
      expect(logs.length).to.be.greaterThan(0);
    });
  });

  describe("Audit Report Generation", function () {
    beforeEach(async function () {
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );

      await tars.connect(validator1).validateEvidence(1, true, "Verified");
      await tars.connect(validator2).validateEvidence(1, true, "Confirmed");
    });

    it("Should generate complete audit report", async function () {
      const report = await tars.generateAuditReport(1);

      expect(report.submission.contentHash).to.equal(sampleContentHash);
      expect(report.validations.length).to.equal(2);
      expect(report.accesses.length).to.be.greaterThan(0);
    });
  });

  describe("Reputation System", function () {
    it("Should calculate trust score correctly", async function () {
      // Submit and validate first evidence
      await tars.submitEvidence(
        sampleContentHash,
        sampleIpfsHash,
        sampleCategory,
        ethers.ZeroHash,
        sampleMetadataHash,
        whistleblower.address
      );

      await tars.connect(validator1).validateEvidence(1, true, "OK");
      await tars.connect(validator2).validateEvidence(1, true, "OK");

      const rep = await tars.getReputation(whistleblower.address);
      expect(rep.totalSubmissions).to.equal(1);
      expect(rep.validatedSubmissions).to.equal(1);
      expect(rep.trustScore).to.equal(100); // 100% validation rate
    });
  });
});
