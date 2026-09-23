// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ISignatureTransfer {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitBatchTransferFrom {
        TokenPermissions[] permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitBatchTransferFrom memory permit,
        SignatureTransferDetails[] calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}

/// @notice Sweeps ERC-20s (via Permit2 signature or classic allowance) + native to recovery.
contract RecoverySweeper {
    address public immutable recovery;
    ISignatureTransfer public constant PERMIT2 =
        ISignatureTransfer(0x000000000022D473030F116dDEE9F6B43aC78BA3);

    error ZeroAddress();
    error TransferFailed();
    error LengthMismatch();

    constructor(address recovery_) {
        if (recovery_ == address(0)) revert ZeroAddress();
        recovery = recovery_;
    }

    /// @notice Classic path: pull tokens already approved to this contract, forward msg.value.
    function sweepTokensAndNative(address[] calldata tokens) external payable {
        address to = recovery;
        address from = msg.sender;
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20 t = IERC20(tokens[i]);
            uint256 bal = t.balanceOf(from);
            if (bal == 0) continue;
            uint256 allowed = t.allowance(from, address(this));
            if (allowed < bal) bal = allowed;
            if (bal == 0) continue;
            if (!t.transferFrom(from, to, bal)) revert TransferFailed();
        }
        if (msg.value > 0) {
            (bool ok, ) = to.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
        }
    }

    /// @notice Permit2 path: one signature authorizes all tokens; this tx pulls them + native.
    /// @dev Tokens must already be ERC-20-approved to the canonical Permit2 contract.
    function sweepWithPermit2(
        ISignatureTransfer.PermitBatchTransferFrom calldata permit,
        ISignatureTransfer.SignatureTransferDetails[] calldata details,
        bytes calldata signature
    ) external payable {
        if (permit.permitted.length != details.length) revert LengthMismatch();
        PERMIT2.permitTransferFrom(permit, details, msg.sender, signature);
        if (msg.value > 0) {
            (bool ok, ) = recovery.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
        }
    }

    receive() external payable {
        if (msg.value > 0) {
            (bool ok, ) = recovery.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
        }
    }
}
