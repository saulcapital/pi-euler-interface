import { parseAbi } from 'viem';

// Euler Vault Kit (EVK) borrow-side surface, layered on top of the ERC-4626 vault interface.
export const EVAULT_ABI = parseAbi([
  'function EVC() view returns (address)',
  'function asset() view returns (address)',
  'function debtOf(address account) view returns (uint256)',
  'function deposit(uint256 amount, address receiver) returns (uint256)',
  'function borrow(uint256 amount, address receiver) returns (uint256)',
  // repay pulls the underlying from the caller and reduces receiver's debt; amount = type(uint256).max
  // repays the full debt (capped at the caller's balance).
  'function repay(uint256 amount, address receiver) returns (uint256)'
]);

// Ethereum Vault Connector — routes account operations and enforces controller/collateral rules.
// A borrow must run through the EVC so the end-of-batch liquidity check can defer until every item
// (enable collateral, enable controller, deposit, borrow) has executed.
export const EVC_ABI = parseAbi([
  'function isCollateralEnabled(address account, address vault) view returns (bool)',
  'function isControllerEnabled(address account, address vault) view returns (bool)',
  'function enableCollateral(address account, address vault)',
  'function enableController(address account, address vault)',
  'function batch((address targetContract, address onBehalfOfAccount, uint256 value, bytes data)[] items)'
]);
