// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TARS - Decentralized Secure Disclosure Network
 * @author TARS Team
 * @notice Production-grade whistleblower platform with on-chain governance
 * @dev Implements role-based access, evidence submission, voting, and reputation system
 */
contract TARS {
    // ============================================================
    // ENUMS
    // ============================================================
    
    /**
     * @notice Status of evidence in the verification pipeline
     */
    enum Status {
        Pending,
        Verified,
        Rejected
    }

    // ============================================================
    // STRUCTS
    // ============================================================
    
    /**
     * @notice Evidence record structure
     * @param id Unique identifier for the evidence
     * @param submitter Address of the employee who submitted
     * @param fileHash SHA-256 hash of the encrypted file
     * @param ipfsCID IPFS Content Identifier for the encrypted file
     * @param approvalCount Number of validator approvals
     * @param rejectionCount Number of validator rejections
     * @param status Current verification status
     * @param timestamp Block timestamp when evidence was submitted
     */
    struct Evidence {
        uint256 id;
        address submitter;
        bytes32 fileHash;
        string ipfsCID;
        uint256 approvalCount;
        uint256 rejectionCount;
        Status status;
        uint256 timestamp;
    }

    // ============================================================
    // STATE VARIABLES
    // ============================================================
    
    /// @notice Contract deployer with supreme administrative privileges
    address public immutable superAdmin;
    
    /// @notice Minimum approvals required for evidence verification
    uint256 public minApprovals;
    
    /// @notice Counter for evidence IDs (starts at 1)
    uint256 public evidenceCounter;
    
    /// @notice Registry of authorized employees
    mapping(address => bool) public isEmployee;
    
    /// @notice Registry of authorized validators
    mapping(address => bool) public isValidator;
    
    /// @notice Evidence records by ID
    mapping(uint256 => Evidence) public evidences;
    
    /// @notice Tracks if a validator has voted on specific evidence
    /// @dev mapping(evidenceId => mapping(validator => hasVoted))
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @notice Tracks how each validator voted (true = approve, false = reject)
    /// @dev mapping(evidenceId => mapping(validator => votedApprove))
    mapping(uint256 => mapping(address => bool)) public voteChoice;
    
    /// @notice Reputation scores for validators
    mapping(address => uint256) public validatorReputation;
    
    /// @notice List of validators who voted on specific evidence (for reputation updates)
    mapping(uint256 => address[]) private evidenceVoters;

    // ============================================================
    // EVENTS
    // ============================================================
    
    /// @notice Emitted when new evidence is submitted
    event EvidenceSubmitted(
        uint256 indexed id,
        address indexed submitter,
        bytes32 fileHash,
        string ipfsCID,
        uint256 timestamp
    );
    
    /// @notice Emitted when evidence is approved (reaches threshold)
    event EvidenceApproved(uint256 indexed id, uint256 approvalCount);
    
    /// @notice Emitted when evidence is rejected (reaches threshold)
    event EvidenceRejected(uint256 indexed id, uint256 rejectionCount);
    
    /// @notice Emitted when a validator is added
    event ValidatorAdded(address indexed validator, uint256 timestamp);
    
    /// @notice Emitted when a validator is removed
    event ValidatorRemoved(address indexed validator, uint256 timestamp);
    
    /// @notice Emitted when an employee is added
    event EmployeeAdded(address indexed employee, uint256 timestamp);
    
    /// @notice Emitted when an employee is removed
    event EmployeeRemoved(address indexed employee, uint256 timestamp);
    
    /// @notice Emitted when a validator's reputation is updated
    event ReputationUpdated(address indexed validator, uint256 newReputation);
    
    /// @notice Emitted for chain of custody tracking
    event CustodyEvent(
        uint256 indexed evidenceId,
        string action,
        address indexed actor,
        uint256 timestamp
    );
    
    /// @notice Emitted when a vote is cast
    event VoteCast(
        uint256 indexed evidenceId,
        address indexed validator,
        bool approved,
        uint256 timestamp
    );

    // ============================================================
    // MODIFIERS
    // ============================================================
    
    /// @notice Restricts function to SuperAdmin only
    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "TARS: caller is not SuperAdmin");
        _;
    }
    
    /// @notice Restricts function to registered employees only
    modifier onlyEmployee() {
        require(isEmployee[msg.sender], "TARS: caller is not an employee");
        _;
    }
    
    /// @notice Restricts function to registered validators only
    modifier onlyValidator() {
        require(isValidator[msg.sender], "TARS: caller is not a validator");
        _;
    }
    
    /// @notice Ensures evidence exists
    modifier evidenceExists(uint256 _id) {
        require(_id > 0 && _id <= evidenceCounter, "TARS: evidence does not exist");
        _;
    }
    
    /// @notice Ensures evidence is still pending
    modifier evidencePending(uint256 _id) {
        require(evidences[_id].status == Status.Pending, "TARS: evidence already finalized");
        _;
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    /**
     * @notice Initializes the TARS contract
     * @param _minApprovals Minimum number of approvals required for verification
     */
    constructor(uint256 _minApprovals) {
        require(_minApprovals > 0, "TARS: minApprovals must be greater than 0");
        superAdmin = msg.sender;
        minApprovals = _minApprovals;
        evidenceCounter = 0;
    }

    // ============================================================
    // ADMIN FUNCTIONS
    // ============================================================
    
    /**
     * @notice Adds an address to the employee registry
     * @param _employee Address to add as employee
     */
    function addEmployee(address _employee) external onlySuperAdmin {
        require(_employee != address(0), "TARS: invalid address");
        require(!isEmployee[_employee], "TARS: already an employee");
        
        isEmployee[_employee] = true;
        
        emit EmployeeAdded(_employee, block.timestamp);
    }
    
    /**
     * @notice Removes an address from the employee registry
     * @param _employee Address to remove from employees
     */
    function removeEmployee(address _employee) external onlySuperAdmin {
        require(isEmployee[_employee], "TARS: not an employee");
        
        isEmployee[_employee] = false;
        
        emit EmployeeRemoved(_employee, block.timestamp);
    }
    
    /**
     * @notice Adds an address to the validator registry
     * @param _validator Address to add as validator
     */
    function addValidator(address _validator) external onlySuperAdmin {
        require(_validator != address(0), "TARS: invalid address");
        require(!isValidator[_validator], "TARS: already a validator");
        
        isValidator[_validator] = true;
        validatorReputation[_validator] = 0; // Initialize reputation
        
        emit ValidatorAdded(_validator, block.timestamp);
    }
    
    /**
     * @notice Removes an address from the validator registry
     * @param _validator Address to remove from validators
     */
    function removeValidator(address _validator) external onlySuperAdmin {
        require(isValidator[_validator], "TARS: not a validator");
        
        isValidator[_validator] = false;
        
        emit ValidatorRemoved(_validator, block.timestamp);
    }
    
    /**
     * @notice Updates the minimum approvals threshold
     * @param _newMinApprovals New threshold value
     */
    function updateMinApprovals(uint256 _newMinApprovals) external onlySuperAdmin {
        require(_newMinApprovals > 0, "TARS: minApprovals must be greater than 0");
        minApprovals = _newMinApprovals;
    }

    // ============================================================
    // EVIDENCE SUBMISSION
    // ============================================================
    
    /**
     * @notice Submits new evidence to the platform
     * @param _fileHash SHA-256 hash of the encrypted evidence file
     * @param _ipfsCID IPFS Content Identifier where encrypted file is stored
     * @return evidenceId The ID of the newly submitted evidence
     */
    function submitEvidence(bytes32 _fileHash, string calldata _ipfsCID) 
        external 
        onlyEmployee 
        returns (uint256 evidenceId) 
    {
        require(_fileHash != bytes32(0), "TARS: invalid file hash");
        require(bytes(_ipfsCID).length > 0, "TARS: invalid IPFS CID");
        
        evidenceCounter++;
        evidenceId = evidenceCounter;
        
        evidences[evidenceId] = Evidence({
            id: evidenceId,
            submitter: msg.sender,
            fileHash: _fileHash,
            ipfsCID: _ipfsCID,
            approvalCount: 0,
            rejectionCount: 0,
            status: Status.Pending,
            timestamp: block.timestamp
        });
        
        emit EvidenceSubmitted(
            evidenceId,
            msg.sender,
            _fileHash,
            _ipfsCID,
            block.timestamp
        );
        
        emit CustodyEvent(
            evidenceId,
            "SUBMITTED",
            msg.sender,
            block.timestamp
        );
        
        return evidenceId;
    }

    // ============================================================
    // VOTING SYSTEM
    // ============================================================
    
    /**
     * @notice Approves an evidence submission
     * @param _id Evidence ID to approve
     */
    function approveEvidence(uint256 _id) 
        external 
        onlyValidator 
        evidenceExists(_id) 
        evidencePending(_id) 
    {
        require(!hasVoted[_id][msg.sender], "TARS: already voted on this evidence");
        
        hasVoted[_id][msg.sender] = true;
        voteChoice[_id][msg.sender] = true; // true = approved
        evidenceVoters[_id].push(msg.sender);
        
        Evidence storage evidence = evidences[_id];
        evidence.approvalCount++;
        
        emit VoteCast(_id, msg.sender, true, block.timestamp);
        
        // Check if threshold reached
        if (evidence.approvalCount >= minApprovals) {
            evidence.status = Status.Verified;
            
            emit EvidenceApproved(_id, evidence.approvalCount);
            
            emit CustodyEvent(
                _id,
                "APPROVED",
                msg.sender,
                block.timestamp
            );
            
            // Update reputation for validators who voted correctly
            _updateReputation(_id, true);
        }
    }
    
    /**
     * @notice Rejects an evidence submission
     * @param _id Evidence ID to reject
     */
    function rejectEvidence(uint256 _id) 
        external 
        onlyValidator 
        evidenceExists(_id) 
        evidencePending(_id) 
    {
        require(!hasVoted[_id][msg.sender], "TARS: already voted on this evidence");
        
        hasVoted[_id][msg.sender] = true;
        voteChoice[_id][msg.sender] = false; // false = rejected
        evidenceVoters[_id].push(msg.sender);
        
        Evidence storage evidence = evidences[_id];
        evidence.rejectionCount++;
        
        emit VoteCast(_id, msg.sender, false, block.timestamp);
        
        // Check if threshold reached
        if (evidence.rejectionCount >= minApprovals) {
            evidence.status = Status.Rejected;
            
            emit EvidenceRejected(_id, evidence.rejectionCount);
            
            emit CustodyEvent(
                _id,
                "REJECTED",
                msg.sender,
                block.timestamp
            );
            
            // Update reputation for validators who voted correctly
            _updateReputation(_id, false);
        }
    }

    // ============================================================
    // REPUTATION SYSTEM
    // ============================================================
    
    /**
     * @notice Updates reputation for validators who voted in the final majority
     * @param _id Evidence ID
     * @param _wasApproved Whether the evidence was approved (true) or rejected (false)
     */
    function _updateReputation(uint256 _id, bool _wasApproved) internal {
        address[] storage voters = evidenceVoters[_id];
        
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            // Check if validator voted with the majority
            if (voteChoice[_id][voter] == _wasApproved) {
                validatorReputation[voter]++;
                emit ReputationUpdated(voter, validatorReputation[voter]);
            }
        }
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================
    
    /**
     * @notice Gets complete evidence details
     * @param _id Evidence ID
     * @return Evidence struct with all details
     */
    function getEvidence(uint256 _id) 
        external 
        view 
        evidenceExists(_id) 
        returns (Evidence memory) 
    {
        return evidences[_id];
    }
    
    /**
     * @notice Gets the current status of evidence
     * @param _id Evidence ID
     * @return Status enum value
     */
    function getEvidenceStatus(uint256 _id) 
        external 
        view 
        evidenceExists(_id) 
        returns (Status) 
    {
        return evidences[_id].status;
    }
    
    /**
     * @notice Checks if a validator has voted on specific evidence
     * @param _id Evidence ID
     * @param _validator Validator address
     * @return bool True if voted
     */
    function hasValidatorVoted(uint256 _id, address _validator) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[_id][_validator];
    }
    
    /**
     * @notice Gets all voters for a specific evidence
     * @param _id Evidence ID
     * @return Array of voter addresses
     */
    function getEvidenceVoters(uint256 _id) 
        external 
        view 
        evidenceExists(_id) 
        returns (address[] memory) 
    {
        return evidenceVoters[_id];
    }
    
    /**
     * @notice Gets total evidence count
     * @return uint256 Total number of evidence submissions
     */
    function getTotalEvidence() external view returns (uint256) {
        return evidenceCounter;
    }
}
