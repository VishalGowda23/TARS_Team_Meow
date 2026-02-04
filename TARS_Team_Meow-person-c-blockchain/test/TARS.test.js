const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("TARS - Decentralized Secure Disclosure Network", function () {
  // ============================================================
  // FIXTURES
  // ============================================================

  async function deployTARSFixture() {
    const MIN_APPROVALS = 2;
    
    const [superAdmin, employee1, employee2, validator1, validator2, validator3, unauthorized] = 
      await ethers.getSigners();

    const TARS = await ethers.getContractFactory("TARS");
    const tars = await TARS.deploy(MIN_APPROVALS);

    // Sample evidence data
    const sampleFileHash = ethers.keccak256(ethers.toUtf8Bytes("confidential_document.pdf"));
    const sampleCID = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

    return { 
      tars, 
      superAdmin, 
      employee1, 
      employee2, 
      validator1, 
      validator2, 
      validator3, 
      unauthorized,
      MIN_APPROVALS,
      sampleFileHash,
      sampleCID
    };
  }

  async function deployWithRolesFixture() {
    const fixture = await loadFixture(deployTARSFixture);
    const { tars, superAdmin, employee1, employee2, validator1, validator2, validator3 } = fixture;

    // Setup roles
    await tars.connect(superAdmin).addEmployee(employee1.address);
    await tars.connect(superAdmin).addEmployee(employee2.address);
    await tars.connect(superAdmin).addValidator(validator1.address);
    await tars.connect(superAdmin).addValidator(validator2.address);
    await tars.connect(superAdmin).addValidator(validator3.address);

    return fixture;
  }

  async function deployWithEvidenceFixture() {
    const fixture = await loadFixture(deployWithRolesFixture);
    const { tars, employee1, sampleFileHash, sampleCID } = fixture;

    // Submit evidence
    await tars.connect(employee1).submitEvidence(sampleFileHash, sampleCID);

    return { ...fixture, evidenceId: 1 };
  }

  // ============================================================
  // DEPLOYMENT TESTS
  // ============================================================

  describe("Deployment", function () {
    it("Should set the correct SuperAdmin", async function () {
      const { tars, superAdmin } = await loadFixture(deployTARSFixture);
      expect(await tars.superAdmin()).to.equal(superAdmin.address);
    });

    it("Should set the correct minApprovals", async function () {
      const { tars, MIN_APPROVALS } = await loadFixture(deployTARSFixture);
      expect(await tars.minApprovals()).to.equal(MIN_APPROVALS);
    });

    it("Should start with zero evidence count", async function () {
      const { tars } = await loadFixture(deployTARSFixture);
      expect(await tars.evidenceCounter()).to.equal(0);
    });

    it("Should revert deployment with zero minApprovals", async function () {
      const TARS = await ethers.getContractFactory("TARS");
      await expect(TARS.deploy(0)).to.be.revertedWith("TARS: minApprovals must be greater than 0");
    });
  });

  // ============================================================
  // ROLE MANAGEMENT TESTS
  // ============================================================

  describe("Role Management", function () {
    describe("Employee Management", function () {
      it("Should allow SuperAdmin to add employee", async function () {
        const { tars, superAdmin, employee1 } = await loadFixture(deployTARSFixture);
        
        await expect(tars.connect(superAdmin).addEmployee(employee1.address))
          .to.emit(tars, "EmployeeAdded");
        
        expect(await tars.isEmployee(employee1.address)).to.be.true;
      });

      it("Should prevent non-SuperAdmin from adding employee", async function () {
        const { tars, employee1, unauthorized } = await loadFixture(deployTARSFixture);
        
        await expect(tars.connect(unauthorized).addEmployee(employee1.address))
          .to.be.revertedWith("TARS: caller is not SuperAdmin");
      });

      it("Should prevent adding zero address as employee", async function () {
        const { tars, superAdmin } = await loadFixture(deployTARSFixture);
        
        await expect(tars.connect(superAdmin).addEmployee(ethers.ZeroAddress))
          .to.be.revertedWith("TARS: invalid address");
      });

      it("Should prevent adding duplicate employee", async function () {
        const { tars, superAdmin, employee1 } = await loadFixture(deployTARSFixture);
        
        await tars.connect(superAdmin).addEmployee(employee1.address);
        await expect(tars.connect(superAdmin).addEmployee(employee1.address))
          .to.be.revertedWith("TARS: already an employee");
      });

      it("Should allow SuperAdmin to remove employee", async function () {
        const { tars, superAdmin, employee1 } = await loadFixture(deployWithRolesFixture);
        
        await expect(tars.connect(superAdmin).removeEmployee(employee1.address))
          .to.emit(tars, "EmployeeRemoved");
        
        expect(await tars.isEmployee(employee1.address)).to.be.false;
      });

      it("Should prevent removing non-existent employee", async function () {
        const { tars, superAdmin, unauthorized } = await loadFixture(deployTARSFixture);
        
        await expect(tars.connect(superAdmin).removeEmployee(unauthorized.address))
          .to.be.revertedWith("TARS: not an employee");
      });
    });

    describe("Validator Management", function () {
      it("Should allow SuperAdmin to add validator", async function () {
        const { tars, superAdmin, validator1 } = await loadFixture(deployTARSFixture);
        
        await expect(tars.connect(superAdmin).addValidator(validator1.address))
          .to.emit(tars, "ValidatorAdded");
        
        expect(await tars.isValidator(validator1.address)).to.be.true;
      });

      it("Should initialize validator reputation to zero", async function () {
        const { tars, superAdmin, validator1 } = await loadFixture(deployTARSFixture);
        
        await tars.connect(superAdmin).addValidator(validator1.address);
        expect(await tars.validatorReputation(validator1.address)).to.equal(0);
      });

      it("Should prevent non-SuperAdmin from adding validator", async function () {
        const { tars, validator1, unauthorized } = await loadFixture(deployTARSFixture);
        
        await expect(tars.connect(unauthorized).addValidator(validator1.address))
          .to.be.revertedWith("TARS: caller is not SuperAdmin");
      });

      it("Should prevent adding duplicate validator", async function () {
        const { tars, superAdmin, validator1 } = await loadFixture(deployTARSFixture);
        
        await tars.connect(superAdmin).addValidator(validator1.address);
        await expect(tars.connect(superAdmin).addValidator(validator1.address))
          .to.be.revertedWith("TARS: already a validator");
      });

      it("Should allow SuperAdmin to remove validator", async function () {
        const { tars, superAdmin, validator1 } = await loadFixture(deployWithRolesFixture);
        
        await expect(tars.connect(superAdmin).removeValidator(validator1.address))
          .to.emit(tars, "ValidatorRemoved");
        
        expect(await tars.isValidator(validator1.address)).to.be.false;
      });
    });
  });

  // ============================================================
  // EVIDENCE SUBMISSION TESTS
  // ============================================================

  describe("Evidence Submission", function () {
    it("Should allow employee to submit evidence", async function () {
      const { tars, employee1, sampleFileHash, sampleCID } = await loadFixture(deployWithRolesFixture);
      
      await expect(tars.connect(employee1).submitEvidence(sampleFileHash, sampleCID))
        .to.emit(tars, "EvidenceSubmitted")
        .and.to.emit(tars, "CustodyEvent");
      
      expect(await tars.evidenceCounter()).to.equal(1);
    });

    it("Should store correct evidence data", async function () {
      const { tars, employee1, sampleFileHash, sampleCID } = await loadFixture(deployWithRolesFixture);
      
      await tars.connect(employee1).submitEvidence(sampleFileHash, sampleCID);
      
      const evidence = await tars.getEvidence(1);
      expect(evidence.id).to.equal(1);
      expect(evidence.submitter).to.equal(employee1.address);
      expect(evidence.fileHash).to.equal(sampleFileHash);
      expect(evidence.ipfsCID).to.equal(sampleCID);
      expect(evidence.approvalCount).to.equal(0);
      expect(evidence.rejectionCount).to.equal(0);
      expect(evidence.status).to.equal(0); // Pending
    });

    it("Should prevent non-employee from submitting evidence", async function () {
      const { tars, unauthorized, sampleFileHash, sampleCID } = await loadFixture(deployWithRolesFixture);
      
      await expect(tars.connect(unauthorized).submitEvidence(sampleFileHash, sampleCID))
        .to.be.revertedWith("TARS: caller is not an employee");
    });

    it("Should prevent submission with empty file hash", async function () {
      const { tars, employee1, sampleCID } = await loadFixture(deployWithRolesFixture);
      
      await expect(tars.connect(employee1).submitEvidence(ethers.ZeroHash, sampleCID))
        .to.be.revertedWith("TARS: invalid file hash");
    });

    it("Should prevent submission with empty IPFS CID", async function () {
      const { tars, employee1, sampleFileHash } = await loadFixture(deployWithRolesFixture);
      
      await expect(tars.connect(employee1).submitEvidence(sampleFileHash, ""))
        .to.be.revertedWith("TARS: invalid IPFS CID");
    });

    it("Should increment evidence counter for multiple submissions", async function () {
      const { tars, employee1, employee2, sampleFileHash, sampleCID } = await loadFixture(deployWithRolesFixture);
      
      await tars.connect(employee1).submitEvidence(sampleFileHash, sampleCID);
      await tars.connect(employee2).submitEvidence(sampleFileHash, sampleCID);
      
      expect(await tars.evidenceCounter()).to.equal(2);
    });
  });

  // ============================================================
  // VOTING SYSTEM TESTS
  // ============================================================

  describe("Voting System", function () {
    describe("Approval Voting", function () {
      it("Should allow validator to approve evidence", async function () {
        const { tars, validator1, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await expect(tars.connect(validator1).approveEvidence(evidenceId))
          .to.emit(tars, "VoteCast");
        
        const evidence = await tars.getEvidence(evidenceId);
        expect(evidence.approvalCount).to.equal(1);
      });

      it("Should prevent non-validator from voting", async function () {
        const { tars, unauthorized, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await expect(tars.connect(unauthorized).approveEvidence(evidenceId))
          .to.be.revertedWith("TARS: caller is not a validator");
      });

      it("Should prevent double voting", async function () {
        const { tars, validator1, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await tars.connect(validator1).approveEvidence(evidenceId);
        await expect(tars.connect(validator1).approveEvidence(evidenceId))
          .to.be.revertedWith("TARS: already voted on this evidence");
      });

      it("Should mark evidence as verified when threshold reached", async function () {
        const { tars, validator1, validator2, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await tars.connect(validator1).approveEvidence(evidenceId);
        
        await expect(tars.connect(validator2).approveEvidence(evidenceId))
          .to.emit(tars, "EvidenceApproved")
          .and.to.emit(tars, "CustodyEvent");
        
        const evidence = await tars.getEvidence(evidenceId);
        expect(evidence.status).to.equal(1); // Verified
      });

      it("Should prevent voting on non-existent evidence", async function () {
        const { tars, validator1 } = await loadFixture(deployWithEvidenceFixture);
        
        await expect(tars.connect(validator1).approveEvidence(999))
          .to.be.revertedWith("TARS: evidence does not exist");
      });

      it("Should prevent voting on finalized evidence", async function () {
        const { tars, validator1, validator2, validator3, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        // Finalize evidence
        await tars.connect(validator1).approveEvidence(evidenceId);
        await tars.connect(validator2).approveEvidence(evidenceId);
        
        // Try to vote after finalization
        await expect(tars.connect(validator3).approveEvidence(evidenceId))
          .to.be.revertedWith("TARS: evidence already finalized");
      });
    });

    describe("Rejection Voting", function () {
      it("Should allow validator to reject evidence", async function () {
        const { tars, validator1, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await expect(tars.connect(validator1).rejectEvidence(evidenceId))
          .to.emit(tars, "VoteCast");
        
        const evidence = await tars.getEvidence(evidenceId);
        expect(evidence.rejectionCount).to.equal(1);
      });

      it("Should mark evidence as rejected when threshold reached", async function () {
        const { tars, validator1, validator2, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await tars.connect(validator1).rejectEvidence(evidenceId);
        
        await expect(tars.connect(validator2).rejectEvidence(evidenceId))
          .to.emit(tars, "EvidenceRejected")
          .and.to.emit(tars, "CustodyEvent");
        
        const evidence = await tars.getEvidence(evidenceId);
        expect(evidence.status).to.equal(2); // Rejected
      });

      it("Should prevent double voting with reject", async function () {
        const { tars, validator1, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await tars.connect(validator1).rejectEvidence(evidenceId);
        await expect(tars.connect(validator1).rejectEvidence(evidenceId))
          .to.be.revertedWith("TARS: already voted on this evidence");
      });

      it("Should prevent voting reject after approval", async function () {
        const { tars, validator1, evidenceId } = await loadFixture(deployWithEvidenceFixture);
        
        await tars.connect(validator1).approveEvidence(evidenceId);
        await expect(tars.connect(validator1).rejectEvidence(evidenceId))
          .to.be.revertedWith("TARS: already voted on this evidence");
      });
    });
  });

  // ============================================================
  // REPUTATION SYSTEM TESTS
  // ============================================================

  describe("Reputation System", function () {
    it("Should increase reputation for validators voting in majority (approval)", async function () {
      const { tars, validator1, validator2, evidenceId } = await loadFixture(deployWithEvidenceFixture);
      
      await tars.connect(validator1).approveEvidence(evidenceId);
      await tars.connect(validator2).approveEvidence(evidenceId);
      
      expect(await tars.validatorReputation(validator1.address)).to.equal(1);
      expect(await tars.validatorReputation(validator2.address)).to.equal(1);
    });

    it("Should increase reputation for validators voting in majority (rejection)", async function () {
      const { tars, validator1, validator2, evidenceId } = await loadFixture(deployWithEvidenceFixture);
      
      await tars.connect(validator1).rejectEvidence(evidenceId);
      await tars.connect(validator2).rejectEvidence(evidenceId);
      
      expect(await tars.validatorReputation(validator1.address)).to.equal(1);
      expect(await tars.validatorReputation(validator2.address)).to.equal(1);
    });

    it("Should NOT increase reputation for minority voters", async function () {
      const { tars, validator1, validator2, validator3, evidenceId } = await loadFixture(deployWithEvidenceFixture);
      
      // validator1 rejects, validator2 and validator3 approve
      await tars.connect(validator1).rejectEvidence(evidenceId);
      await tars.connect(validator2).approveEvidence(evidenceId);
      await tars.connect(validator3).approveEvidence(evidenceId);
      
      // Minority voter (validator1) should not get reputation boost
      expect(await tars.validatorReputation(validator1.address)).to.equal(0);
      // Majority voters should get reputation boost
      expect(await tars.validatorReputation(validator2.address)).to.equal(1);
      expect(await tars.validatorReputation(validator3.address)).to.equal(1);
    });

    it("Should emit ReputationUpdated event", async function () {
      const { tars, validator1, validator2, evidenceId } = await loadFixture(deployWithEvidenceFixture);
      
      await tars.connect(validator1).approveEvidence(evidenceId);
      
      await expect(tars.connect(validator2).approveEvidence(evidenceId))
        .to.emit(tars, "ReputationUpdated")
        .withArgs(validator1.address, 1);
    });

    it("Should accumulate reputation over multiple evidence verifications", async function () {
      const { tars, superAdmin, employee1, validator1, validator2, sampleFileHash, sampleCID } = 
        await loadFixture(deployWithEvidenceFixture);
      
      // First evidence already exists, verify it
      await tars.connect(validator1).approveEvidence(1);
      await tars.connect(validator2).approveEvidence(1);
      
      // Submit and verify second evidence
      await tars.connect(employee1).submitEvidence(sampleFileHash, sampleCID);
      await tars.connect(validator1).approveEvidence(2);
      await tars.connect(validator2).approveEvidence(2);
      
      expect(await tars.validatorReputation(validator1.address)).to.equal(2);
      expect(await tars.validatorReputation(validator2.address)).to.equal(2);
    });
  });

  // ============================================================
  // SECURITY TESTS
  // ============================================================

  describe("Security", function () {
    it("Should prevent SuperAdmin from directly changing evidence status", async function () {
      const { tars, superAdmin, evidenceId } = await loadFixture(deployWithEvidenceFixture);
      
      // SuperAdmin is not a validator, cannot vote
      await expect(tars.connect(superAdmin).approveEvidence(evidenceId))
        .to.be.revertedWith("TARS: caller is not a validator");
    });

    it("Should maintain immutable evidence data after submission", async function () {
      const { tars, validator1, validator2, evidenceId, sampleFileHash, sampleCID, employee1 } = 
        await loadFixture(deployWithEvidenceFixture);
      
      // Get initial evidence data
      const initialEvidence = await tars.getEvidence(evidenceId);
      
      // Finalize evidence
      await tars.connect(validator1).approveEvidence(evidenceId);
      await tars.connect(validator2).approveEvidence(evidenceId);
      
      // Check that core data remains unchanged
      const finalEvidence = await tars.getEvidence(evidenceId);
      expect(finalEvidence.fileHash).to.equal(initialEvidence.fileHash);
      expect(finalEvidence.ipfsCID).to.equal(initialEvidence.ipfsCID);
      expect(finalEvidence.submitter).to.equal(initialEvidence.submitter);
      expect(finalEvidence.timestamp).to.equal(initialEvidence.timestamp);
    });

    it("Should track all voters correctly", async function () {
      const { tars, validator1, validator2, validator3, evidenceId } = 
        await loadFixture(deployWithEvidenceFixture);
      
      await tars.connect(validator1).approveEvidence(evidenceId);
      await tars.connect(validator2).rejectEvidence(evidenceId);
      await tars.connect(validator3).approveEvidence(evidenceId);
      
      const voters = await tars.getEvidenceVoters(evidenceId);
      expect(voters.length).to.equal(3);
      expect(voters).to.include(validator1.address);
      expect(voters).to.include(validator2.address);
      expect(voters).to.include(validator3.address);
    });

    it("Should correctly track individual vote choices", async function () {
      const { tars, validator1, validator2, evidenceId } = await loadFixture(deployWithEvidenceFixture);
      
      await tars.connect(validator1).approveEvidence(evidenceId);
      await tars.connect(validator2).rejectEvidence(evidenceId);
      
      expect(await tars.hasValidatorVoted(evidenceId, validator1.address)).to.be.true;
      expect(await tars.hasValidatorVoted(evidenceId, validator2.address)).to.be.true;
    });
  });

  // ============================================================
  // VIEW FUNCTION TESTS
  // ============================================================

  describe("View Functions", function () {
    it("Should return correct total evidence count", async function () {
      const { tars, employee1, employee2, sampleFileHash, sampleCID } = 
        await loadFixture(deployWithRolesFixture);
      
      expect(await tars.getTotalEvidence()).to.equal(0);
      
      await tars.connect(employee1).submitEvidence(sampleFileHash, sampleCID);
      expect(await tars.getTotalEvidence()).to.equal(1);
      
      await tars.connect(employee2).submitEvidence(sampleFileHash, sampleCID);
      expect(await tars.getTotalEvidence()).to.equal(2);
    });

    it("Should return correct evidence status", async function () {
      const { tars, validator1, validator2, evidenceId } = await loadFixture(deployWithEvidenceFixture);
      
      expect(await tars.getEvidenceStatus(evidenceId)).to.equal(0); // Pending
      
      await tars.connect(validator1).approveEvidence(evidenceId);
      expect(await tars.getEvidenceStatus(evidenceId)).to.equal(0); // Still Pending
      
      await tars.connect(validator2).approveEvidence(evidenceId);
      expect(await tars.getEvidenceStatus(evidenceId)).to.equal(1); // Verified
    });
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
