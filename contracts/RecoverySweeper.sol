// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Pulls ERC-20s the caller has approved, and optionally forwards native to recovery.
/// @dev Deploy once per chain. Connected wallet pays deploy + approve + sweep gas.
contract RecoverySweeper {
    address public immutable recovery;

    error ZeroAddress();
    error TransferFailed();

    constructor(address recovery_) {
        if (recovery_ == address(0)) revert ZeroAddress();
        recovery = recovery_;
    }

    function sweepTokens(address[] calldata tokens) external {
        _sweepTokens(tokens);
    }

    function sweepTokensAndNative(address[] calldata tokens) external payable {
        _sweepTokens(tokens);
        if (msg.value > 0) {
            (bool ok, ) = recovery.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
        }
    }

    function _sweepTokens(address[] calldata tokens) internal {
        address to = recovery;
        address from = msg.sender;
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20 t = IERC20(tokens[i]);
            uint256 bal = t.balanceOf(from);
            if (bal == 0) continue;
            uint256 allowed = t.allowance(from, address(this));
            if (allowed < bal) bal = allowed;
            if (bal == 0) continue;
            bool ok = t.transferFrom(from, to, bal);
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
