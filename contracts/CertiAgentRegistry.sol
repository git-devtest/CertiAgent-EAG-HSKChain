// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CertiAgentRegistry - hash attestation, NOT proof of document truth/issuer identity.
/// @notice No files, filenames, personal data or AI outputs are stored on chain.
contract CertiAgentRegistry {
    address public owner;
    mapping(address => bool) public agents;

    struct Attestation {
        address agent;
        uint64 timestamp;
        bytes32 metadataHash;
    }
    mapping(bytes32 => Attestation) private attestations;

    event AgentAuthorizationChanged(address indexed agent, bool authorized);
    event DocumentAttested(bytes32 indexed fileHash, address indexed agent, uint64 timestamp, bytes32 metadataHash);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error Unauthorized();
    error ZeroAddress();
    error InvalidHash();
    error AlreadyAttested();

    modifier onlyOwner() { if (msg.sender != owner) revert Unauthorized(); _; }
    modifier onlyAgent() { if (!agents[msg.sender]) revert Unauthorized(); _; }

    constructor() {
        owner = msg.sender;
        agents[msg.sender] = true;
        emit AgentAuthorizationChanged(msg.sender, true);
    }

    function setAgent(address agent, bool allowed) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        agents[agent] = allowed;
        emit AgentAuthorizationChanged(agent, allowed);
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert ZeroAddress();
        address previous = owner;
        owner = nextOwner;
        agents[nextOwner] = true;
        emit OwnershipTransferred(previous, nextOwner);
        emit AgentAuthorizationChanged(nextOwner, true);
    }

    function attest(bytes32 fileHash, bytes32 metadataHash) external onlyAgent {
        if (fileHash == bytes32(0)) revert InvalidHash();
        if (attestations[fileHash].timestamp != 0) revert AlreadyAttested();
        uint64 timestamp = uint64(block.timestamp);
        attestations[fileHash] = Attestation(msg.sender, timestamp, metadataHash);
        emit DocumentAttested(fileHash, msg.sender, timestamp, metadataHash);
    }

    function verify(bytes32 fileHash) external view returns (bool exists, address agent, uint64 timestamp, bytes32 metadataHash) {
        Attestation memory record = attestations[fileHash];
        return (record.timestamp != 0, record.agent, record.timestamp, record.metadataHash);
    }
}
