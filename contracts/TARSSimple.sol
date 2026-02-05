// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TARS - Trustless Anonymous Reporting System (Simplified)
 * @notice Decentralized whistleblowing platform with cryptographic proof-of-existence
 * @dev Deployed on Sepolia Testnet - Optimized for Remix
 */
contract TARS is AccessControl, ReentrancyGuard {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    uint256 public validatorThreshold = 2;
    uint256 private _submissionCounter;

    enum SubmissionStatus { Pending, UnderReview, Validated, Rejected, Released }

    struct Submission {
        uint256 id;
        bytes32 contentHash;
        string ipfsHash;
        uint256 timestamp;
        uint256 blockNumber;
        address pseudonymousId;
        SubmissionStatus status;
        uint256 validationCount;
        uint256 rejectionCount;
        string category;
        bool isPublic;
    }

    struct ValidationRecord {
        address validator;
        uint256 timestamp;
        bool approved;
        string comment;
    }

    struct AccessLog {
        address accessor;
        uint256 timestamp;
        string action;
    }

    struct Reputation {
        uint256 totalSubmissions;
        uint256 validatedSubmissions;
        uint256 trustScore;
    }

    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => ValidationRecord[]) private validationHistory;
    mapping(uint256 => AccessLog[]) private accessLogs;
    mapping(uint256 => mapping(address => bool)) public hasValidated;
    mapping(address => Reputation) public reputations;
    mapping(bytes32 => uint256) public hashToSubmissionId;
    mapping(uint256 => mapping(address => bool)) public authorizedViewers;

    event SubmissionCreated(uint256 indexed id, bytes32 indexed contentHash, string ipfsHash, uint256 timestamp, string category);
    event SubmissionValidated(uint256 indexed id, address indexed validator, bool approved, uint256 timestamp);
    event SubmissionStatusChanged(uint256 indexed id, SubmissionStatus newStatus);
    event EvidenceAccessed(uint256 indexed id, address indexed accessor, string action);
    event SelectiveDisclosure(uint256 indexed id, address indexed authorizedParty);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }

    function submitEvidence(
        bytes32 _contentHash,
        string calldata _ipfsHash,
        string calldata _category,
        address _pseudonymousId
    ) external nonReentrant returns (uint256) {
        require(_contentHash != bytes32(0), "Invalid content hash");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        require(hashToSubmissionId[_contentHash] == 0, "Evidence already submitted");

        _submissionCounter++;
        uint256 newId = _submissionCounter;

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
            isPublic: false
        });

        hashToSubmissionId[_contentHash] = newId;
        
        Reputation storage rep = reputations[_pseudonymousId];
        rep.totalSubmissions++;

        _addAccessLog(newId, _pseudonymousId, "submit");

        emit SubmissionCreated(newId, _contentHash, _ipfsHash, block.timestamp, _category);
        return newId;
    }

    function validateEvidence(
        uint256 _submissionId,
        bool _approved,
        string calldata _comment
    ) external onlyRole(VALIDATOR_ROLE) nonReentrant {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(!hasValidated[_submissionId][msg.sender], "Already validated");
        require(submission.status == SubmissionStatus.Pending || submission.status == SubmissionStatus.UnderReview, "Cannot validate");

        hasValidated[_submissionId][msg.sender] = true;

        validationHistory[_submissionId].push(ValidationRecord({
            validator: msg.sender,
            timestamp: block.timestamp,
            approved: _approved,
            comment: _comment
        }));

        if (_approved) {
            submission.validationCount++;
        } else {
            submission.rejectionCount++;
        }

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

        _addAccessLog(_submissionId, msg.sender, "validate");
        emit SubmissionValidated(_submissionId, msg.sender, _approved, block.timestamp);
        emit SubmissionStatusChanged(_submissionId, submission.status);
    }

    function authorizeViewer(uint256 _submissionId, address _authorizedParty) external {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(msg.sender == submission.pseudonymousId || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");

        authorizedViewers[_submissionId][_authorizedParty] = true;
        emit SelectiveDisclosure(_submissionId, _authorizedParty);
    }

    function releaseEvidence(uint256 _submissionId) external {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(submission.status == SubmissionStatus.Validated, "Must be validated first");
        require(msg.sender == submission.pseudonymousId || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");

        submission.status = SubmissionStatus.Released;
        submission.isPublic = true;

        _addAccessLog(_submissionId, msg.sender, "release");
        emit SubmissionStatusChanged(_submissionId, SubmissionStatus.Released);
    }

    function logEvidenceAccess(uint256 _submissionId, string calldata _action) external {
        Submission storage submission = submissions[_submissionId];
        require(submission.id != 0, "Submission does not exist");
        require(
            submission.isPublic || 
            authorizedViewers[_submissionId][msg.sender] ||
            hasRole(VALIDATOR_ROLE, msg.sender),
            "Not authorized"
        );

        _addAccessLog(_submissionId, msg.sender, _action);
    }

    // View functions - simplified to avoid stack issues
    
    function verifyProofOfExistence(bytes32 _contentHash) external view returns (bool exists, uint256 submissionId, uint256 timestamp) {
        submissionId = hashToSubmissionId[_contentHash];
        if (submissionId != 0) {
            return (true, submissionId, submissions[submissionId].timestamp);
        }
        return (false, 0, 0);
    }

    function getSubmissionBasic(uint256 _submissionId) external view returns (
        bytes32 contentHash,
        string memory ipfsHash,
        uint256 timestamp,
        uint256 blockNumber,
        uint8 status,
        bool isPublic
    ) {
        Submission storage s = submissions[_submissionId];
        require(s.id != 0, "Not found");
        return (s.contentHash, s.ipfsHash, s.timestamp, s.blockNumber, uint8(s.status), s.isPublic);
    }

    function getSubmissionDetails(uint256 _submissionId) external view returns (
        address pseudonymousId,
        uint256 validationCount,
        uint256 rejectionCount,
        string memory category
    ) {
        Submission storage s = submissions[_submissionId];
        require(s.id != 0, "Not found");
        return (s.pseudonymousId, s.validationCount, s.rejectionCount, s.category);
    }

    function getValidationCount(uint256 _submissionId) external view returns (uint256) {
        return validationHistory[_submissionId].length;
    }

    function getValidation(uint256 _submissionId, uint256 _index) external view returns (
        address validator,
        uint256 timestamp,
        bool approved,
        string memory comment
    ) {
        ValidationRecord storage v = validationHistory[_submissionId][_index];
        return (v.validator, v.timestamp, v.approved, v.comment);
    }

    function getAccessLogCount(uint256 _submissionId) external view returns (uint256) {
        return accessLogs[_submissionId].length;
    }

    function getAccessLog(uint256 _submissionId, uint256 _index) external view returns (
        address accessor,
        uint256 timestamp,
        string memory action
    ) {
        AccessLog storage a = accessLogs[_submissionId][_index];
        return (a.accessor, a.timestamp, a.action);
    }

    function getReputation(address _pseudonymousId) external view returns (uint256 total, uint256 validated, uint256 score) {
        Reputation storage r = reputations[_pseudonymousId];
        return (r.totalSubmissions, r.validatedSubmissions, r.trustScore);
    }

    function getTotalSubmissions() external view returns (uint256) {
        return _submissionCounter;
    }

    // Admin functions
    
    function setValidatorThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold > 0, "Invalid threshold");
        validatorThreshold = _threshold;
    }

    function addValidator(address _validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VALIDATOR_ROLE, _validator);
    }

    function removeValidator(address _validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VALIDATOR_ROLE, _validator);
    }

    // Internal functions

    function _addAccessLog(uint256 _submissionId, address _accessor, string memory _action) internal {
        accessLogs[_submissionId].push(AccessLog({
            accessor: _accessor,
            timestamp: block.timestamp,
            action: _action
        }));
        emit EvidenceAccessed(_submissionId, _accessor, _action);
    }

    function _updateReputation(address _pseudonymousId, bool _validated) internal {
        Reputation storage rep = reputations[_pseudonymousId];
        if (_validated) {
            rep.validatedSubmissions++;
        }
        if (rep.totalSubmissions > 0) {
            rep.trustScore = (rep.validatedSubmissions * 100) / rep.totalSubmissions;
        }
    }
}
