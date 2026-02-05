// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TARS - Trustless Anonymous Reporting System
 * @notice Decentralized whistleblowing platform with cryptographic proof-of-existence
 * @dev Deployed on Sepolia Testnet
 */
contract TARS is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Roles for multi-party validation
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // Minimum validators required for evidence verification
    uint256 public constant MIN_VALIDATORS = 3;
    uint256 public validatorThreshold = 2; // Consensus threshold

    Counters.Counter private _submissionIds;

    // Evidence submission status
    enum SubmissionStatus {
        Pending,
        UnderReview,
        Validated,
        Rejected,
        Released
    }

    // Evidence submission structure
    struct Submission {
        uint256 id;
        bytes32 contentHash;        // SHA-256 hash of the original content
        string ipfsHash;            // IPFS CID for decentralized storage
        uint256 timestamp;          // Block timestamp for proof-of-existence
        uint256 blockNumber;        // Block number for additional verification
        address pseudonymousId;     // Derived address for reputation (not real identity)
        SubmissionStatus status;
        uint256 validationCount;
        uint256 rejectionCount;
        string category;            // Type of whistleblowing (corporate, government, etc.)
        bytes32 encryptionKeyHash;  // Hash of encryption key for selective disclosure
        bool isPublic;              // Whether evidence is publicly accessible
        string metadataHash;        // Hash proving metadata was stripped
    }

    // Validation record for audit trail
    struct ValidationRecord {
        address validator;
        uint256 timestamp;
        bool approved;
        string comment;
        bytes32 validationHash;     // Hash of validation data for integrity
    }

    // Access log for chain of custody
    struct AccessLog {
        address accessor;
        uint256 timestamp;
        string action;              // "view", "download", "verify", etc.
        bytes32 accessHash;         // Hash proving access details
    }

    // Pseudonymous reputation
    struct WhistleblowerReputation {
        uint256 totalSubmissions;
        uint256 validatedSubmissions;
        uint256 trustScore;         // Calculated based on validation history
        uint256 firstSubmission;
        uint256 lastSubmission;
    }

    // Storage mappings
    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => ValidationRecord[]) public validationHistory;
    mapping(uint256 => AccessLog[]) public accessLogs;
    mapping(uint256 => mapping(address => bool)) public hasValidated;
    mapping(address => WhistleblowerReputation) public reputations;
    mapping(bytes32 => uint256) public hashToSubmissionId; // Prevent duplicate submissions
    mapping(uint256 => mapping(address => bool)) public authorizedViewers; // Selective disclosure

    // Events for transparency and indexing
    event SubmissionCreated(
        uint256 indexed id,
        bytes32 indexed contentHash,
        string ipfsHash,
        uint256 timestamp,
        string category
    );

    event SubmissionValidated(
        uint256 indexed id,
        address indexed validator,
        bool approved,
        uint256 timestamp
    );

    event SubmissionStatusChanged(
        uint256 indexed id,
        SubmissionStatus oldStatus,
        SubmissionStatus newStatus,
        uint256 timestamp
    );

    event EvidenceAccessed(
        uint256 indexed id,
        address indexed accessor,
        string action,
        uint256 timestamp
    );

    event SelectiveDisclosure(
        uint256 indexed id,
        address indexed authorizedParty,
        uint256 timestamp
    );

    event ReputationUpdated(
        address indexed pseudonymousId,
        uint256 newTrustScore,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    /**
     * @notice Submit evidence with cryptographic proof
     * @param _contentHash SHA-256 hash of the original content
     * @param _ipfsHash IPFS CID where sanitized content is stored
     * @param _category Type of whistleblowing submission
     * @param _encryptionKeyHash Hash of encryption key for selective disclosure
     * @param _metadataHash Hash proving metadata stripping was performed
     * @param _pseudonymousId Derived address for reputation tracking
     */
    function submitEvidence(
        bytes32 _contentHash,
        string calldata _ipfsHash,
        string calldata _category,
        bytes32 _encryptionKeyHash,
        string calldata _metadataHash,
        address _pseudonymousId
    ) external nonReentrant returns (uint256) {
        require(_contentHash != bytes32(0), "Invalid content hash");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        require(hashToSubmissionId[_contentHash] == 0, "Evidence already submitted");

        _submissionIds.increment();
        uint256 newId = _submissionIds.current();

        submissions[newId] = Submission({
            id: newId,
            contentHash: _contentHash,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            blockNumber: block.number,
            pseudonymousId: _pseudonymousId,
            status: SubmissionStatus.Pending,
            validationCount: 0,
            rejectionCount: 0,
            category: _category,
            encryptionKeyHash: _encryptionKeyHash,
            isPublic: false,
            metadataHash: _metadataHash
        });

        hashToSubmissionId[_contentHash] = newId;

        // Update reputation
        WhistleblowerReputation storage rep = reputations[_pseudonymousId];
        rep.totalSubmissions++;
        if (rep.firstSubmission == 0) {
            rep.firstSubmission = block.timestamp;
        }
        rep.lastSubmission = block.timestamp;

        // Log the submission access
        _logAccess(newId, _pseudonymousId, "submit");

        emit SubmissionCreated(newId, _contentHash, _ipfsHash, block.timestamp, _category);

        return newId;
    }

    /**
     * @notice Validate evidence (multi-party consensus)
     * @param _submissionId ID of the submission to validate
     * @param _approved Whether the validator approves the evidence
     * @param _comment Validation comment
     */
    function validateEvidence(
        uint256 _submissionId,
        bool _approved,
        string calldata _comment
    ) external onlyRole(VALIDATOR_ROLE) nonReentrant {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(!hasValidated[_submissionId][msg.sender], "Already validated");
        require(
            submission.status == SubmissionStatus.Pending || 
            submission.status == SubmissionStatus.UnderReview,
            "Cannot validate in current status"
        );

        hasValidated[_submissionId][msg.sender] = true;

        // Create validation hash for integrity
        bytes32 validationHash = keccak256(abi.encodePacked(
            _submissionId,
            msg.sender,
            block.timestamp,
            _approved,
            _comment
        ));

        validationHistory[_submissionId].push(ValidationRecord({
            validator: msg.sender,
            timestamp: block.timestamp,
            approved: _approved,
            comment: _comment,
            validationHash: validationHash
        }));

        if (_approved) {
            submission.validationCount++;
        } else {
            submission.rejectionCount++;
        }

        // Update status based on validation count
        SubmissionStatus oldStatus = submission.status;
        
        if (submission.status == SubmissionStatus.Pending) {
            submission.status = SubmissionStatus.UnderReview;
        }

        if (submission.validationCount >= validatorThreshold) {
            submission.status = SubmissionStatus.Validated;
            _updateReputation(submission.pseudonymousId, true);
        } else if (submission.rejectionCount >= validatorThreshold) {
            submission.status = SubmissionStatus.Rejected;
            _updateReputation(submission.pseudonymousId, false);
        }

        _logAccess(_submissionId, msg.sender, "validate");

        emit SubmissionValidated(_submissionId, msg.sender, _approved, block.timestamp);
        
        if (oldStatus != submission.status) {
            emit SubmissionStatusChanged(_submissionId, oldStatus, submission.status, block.timestamp);
        }
    }

    /**
     * @notice Authorize a party for selective disclosure
     * @param _submissionId ID of the submission
     * @param _authorizedParty Address to authorize
     */
    function authorizeViewer(
        uint256 _submissionId,
        address _authorizedParty
    ) external {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(
            msg.sender == submission.pseudonymousId || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );

        authorizedViewers[_submissionId][_authorizedParty] = true;

        emit SelectiveDisclosure(_submissionId, _authorizedParty, block.timestamp);
    }

    /**
     * @notice Make evidence publicly accessible
     * @param _submissionId ID of the submission
     */
    function releaseEvidence(uint256 _submissionId) external {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(submission.status == SubmissionStatus.Validated, "Must be validated first");
        require(
            msg.sender == submission.pseudonymousId || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );

        SubmissionStatus oldStatus = submission.status;
        submission.status = SubmissionStatus.Released;
        submission.isPublic = true;

        _logAccess(_submissionId, msg.sender, "release");

        emit SubmissionStatusChanged(_submissionId, oldStatus, SubmissionStatus.Released, block.timestamp);
    }

    /**
     * @notice Log access to evidence for chain of custody
     * @param _submissionId ID of the submission accessed
     * @param _action Type of access action
     */
    function logEvidenceAccess(
        uint256 _submissionId,
        string calldata _action
    ) external {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(
            submission.isPublic || 
            authorizedViewers[_submissionId][msg.sender] ||
            hasRole(VALIDATOR_ROLE, msg.sender) ||
            hasRole(AUDITOR_ROLE, msg.sender),
            "Not authorized to access"
        );

        _logAccess(_submissionId, msg.sender, _action);
    }

    /**
     * @notice Verify proof of existence for a content hash
     * @param _contentHash Hash to verify
     * @return exists Whether the hash exists
     * @return submissionId ID if exists
     * @return timestamp Original timestamp
     * @return blockNumber Original block number
     */
    function verifyProofOfExistence(bytes32 _contentHash) external view returns (
        bool exists,
        uint256 submissionId,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        submissionId = hashToSubmissionId[_contentHash];
        if (submissionId != 0) {
            Submission storage submission = submissions[submissionId];
            return (true, submissionId, submission.timestamp, submission.blockNumber);
        }
        return (false, 0, 0, 0);
    }

    /**
     * @notice Get full submission details
     */
    function getSubmission(uint256 _submissionId) external view returns (Submission memory) {
        require(submissions[_submissionId].id != 0, "Submission does not exist");
        return submissions[_submissionId];
    }

    /**
     * @notice Get validation history for audit
     */
    function getValidationHistory(uint256 _submissionId) external view returns (ValidationRecord[] memory) {
        return validationHistory[_submissionId];
    }

    /**
     * @notice Get access logs for chain of custody
     */
    function getAccessLogs(uint256 _submissionId) external view returns (AccessLog[] memory) {
        return accessLogs[_submissionId];
    }

    /**
     * @notice Get whistleblower reputation
     */
    function getReputation(address _pseudonymousId) external view returns (WhistleblowerReputation memory) {
        return reputations[_pseudonymousId];
    }

    /**
     * @notice Get total submissions count
     */
    function getTotalSubmissions() external view returns (uint256) {
        return _submissionIds.current();
    }

    /**
     * @notice Get submission for audit
     */
    function getAuditSubmission(uint256 _submissionId) external view returns (Submission memory) {
        require(submissions[_submissionId].id != 0, "Submission does not exist");
        return submissions[_submissionId];
    }

    /**
     * @notice Get pseudonymous ID for a submission (for reputation lookup)
     */
    function getSubmissionOwner(uint256 _submissionId) external view returns (address) {
        require(submissions[_submissionId].id != 0, "Submission does not exist");
        return submissions[_submissionId].pseudonymousId;
    }

    /**
     * @notice Update validator threshold (admin only)
     */
    function setValidatorThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold > 0 && _threshold <= MIN_VALIDATORS, "Invalid threshold");
        validatorThreshold = _threshold;
    }

    /**
     * @notice Add a new validator
     */
    function addValidator(address _validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VALIDATOR_ROLE, _validator);
    }

    /**
     * @notice Remove a validator
     */
    function removeValidator(address _validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VALIDATOR_ROLE, _validator);
    }

    // Internal functions

    function _logAccess(uint256 _submissionId, address _accessor, string memory _action) internal {
        bytes32 accessHash = keccak256(abi.encodePacked(
            _submissionId,
            _accessor,
            block.timestamp,
            _action
        ));

        accessLogs[_submissionId].push(AccessLog({
            accessor: _accessor,
            timestamp: block.timestamp,
            action: _action,
            accessHash: accessHash
        }));

        emit EvidenceAccessed(_submissionId, _accessor, _action, block.timestamp);
    }

    function _updateReputation(address _pseudonymousId, bool _validated) internal {
        WhistleblowerReputation storage rep = reputations[_pseudonymousId];
        
        if (_validated) {
            rep.validatedSubmissions++;
        }

        // Calculate trust score (0-100)
        if (rep.totalSubmissions > 0) {
            rep.trustScore = (rep.validatedSubmissions * 100) / rep.totalSubmissions;
        }

        emit ReputationUpdated(_pseudonymousId, rep.trustScore, block.timestamp);
    }
}
