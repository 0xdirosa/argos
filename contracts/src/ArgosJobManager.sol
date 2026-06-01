// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ArgosJobManager {
    address public immutable owner;
    address public immutable validator;

    enum JobStatus { Created, Processing, Completed, Failed }

    struct Job {
        bytes32 jobId;
        address client;
        uint256 fee;
        bytes32 resultHash;
        JobStatus status;
    }

    mapping(bytes32 => Job) public jobs;

    event JobCreated(bytes32 indexed jobId, address indexed client, uint256 fee);
    event JobCompleted(bytes32 indexed jobId, bytes32 resultHash);
    event JobFailed(bytes32 indexed jobId, string reason);

    constructor(address _owner, address _validator) {
        require(_owner != address(0), "Invalid owner");
        require(_validator != address(0), "Invalid validator");
        require(_owner != _validator, "Owner and validator must differ");
        owner = _owner;
        validator = _validator;
    }

    function createJob(bytes32 jobId, uint256 fee) external {
        require(jobs[jobId].jobId == bytes32(0), "Job already exists");
        jobs[jobId] = Job(jobId, msg.sender, fee, 0, JobStatus.Created);
        emit JobCreated(jobId, msg.sender, fee);
    }

    function settleJob(bytes32 jobId, bytes32 resultHash) external {
        require(msg.sender == validator, "Only validator can settle");
        require(
            jobs[jobId].status == JobStatus.Created ||
            jobs[jobId].status == JobStatus.Processing,
            "Invalid status"
        );
        require(resultHash != bytes32(0), "Result hash required");
        jobs[jobId].status = JobStatus.Completed;
        jobs[jobId].resultHash = resultHash;
        emit JobCompleted(jobId, resultHash);
    }

    function failJob(bytes32 jobId, string calldata reason) external {
        require(msg.sender == validator, "Only validator");
        jobs[jobId].status = JobStatus.Failed;
        emit JobFailed(jobId, reason);
    }

    function getJob(bytes32 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
}
