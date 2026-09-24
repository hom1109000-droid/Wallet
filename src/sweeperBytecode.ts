export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export const SWEEPER_ABI = [{"inputs": [{"internalType": "address", "name": "recovery_", "type": "address"}], "stateMutability": "nonpayable", "type": "constructor"}, {"inputs": [], "name": "LengthMismatch", "type": "error"}, {"inputs": [], "name": "TransferFailed", "type": "error"}, {"inputs": [], "name": "ZeroAddress", "type": "error"}, {"inputs": [], "name": "PERMIT2", "outputs": [{"internalType": "contract ISignatureTransfer", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "recovery", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address[]", "name": "tokens", "type": "address[]"}], "name": "sweepTokensAndNative", "outputs": [], "stateMutability": "payable", "type": "function"}, {"inputs": [{"components": [{"components": [{"internalType": "address", "name": "token", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "internalType": "struct ISignatureTransfer.TokenPermissions[]", "name": "permitted", "type": "tuple[]"}, {"internalType": "uint256", "name": "nonce", "type": "uint256"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}], "internalType": "struct ISignatureTransfer.PermitBatchTransferFrom", "name": "permit", "type": "tuple"}, {"components": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "requestedAmount", "type": "uint256"}], "internalType": "struct ISignatureTransfer.SignatureTransferDetails[]", "name": "details", "type": "tuple[]"}, {"internalType": "bytes", "name": "signature", "type": "bytes"}], "name": "sweepWithPermit2", "outputs": [], "stateMutability": "payable", "type": "function"}, {"stateMutability": "payable", "type": "receive"}] as const;

// solc 0.8.24 optimized — full creation bytecode for RecoverySweeper with Permit2
export const SWEEPER_B64 =
  'YKBgQFI0gBVhAA9XX4D9W1BgQFFhBe84A4BhBe+DOYEBYECBkFJhAC6RYQBmVltgAWABYKAbA4EWYQBVV2BAUWPZLiM9YOAbgVJg' +
  'BAFgQFGAkQOQ/VtgAWABYKAbAxZggFJhAJNWW19gIIKEAxIVYQB2V1+A/VuBUWABYAFgoBsDgRaBFGEAjFdfgP1bk5JQUFBWW2CA' +
  'UWEFMGEAv185X4GBYEQBUoGBYQEcAVKBgWEBbQFSYQIIAVJhBTBf8/5ggGBAUmAENhBhADZXXzVg4ByAYxoiEPsUYQDZV4BjkJsZ' +
  '2RRhAOxXgGPdzq+pFGEBC1dfgP1bNmEA1Vc0FWEA01dffwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAFgAWCgGwMW' +
  'NGBAUV9gQFGAgwOBhYda8ZJQUFA9gF+BFGEAqldgQFGRUGAfGWA/PQEWggFgQFI9glI9X2AghAE+YQCvVltgYJFQW1BQkFCAYQDR' +
  'V2BAUWMSFx2DYOMbgVJgBAFgQFGAkQOQ/VtQWwBbX4D9W2EA02EA5zZgBGEEFFZbYQFaVls0gBVhAPdXX4D9W1BhANNhAQY2YARh' +
  'BBRWW2ECAFZbNIAVYQEWV1+A/VtQYQE+fwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgVZbYEBRYAFgAWCgGwOQkRaB' +
  'UmAgAWBAUYCRA5DzW2EBZIKCYQIGVls0FWEB/FdffwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAFgAWCgGwMWNGBA' +
  'UV9gQFGAgwOBhYda8ZJQUFA9gF+BFGEB01dgQFGRUGAfGWA/PQEWggFgQFI9glI9X2AghAE+YQHYVltgYJFQW1BQkFCAYQH6V2BA' +
  'UWMSFx2DYOMbgVJgBAFgQFGAkQOQ/VtQW1BQVlthAfyCglt/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzX1uDgRAV' +
  'YQQNV1+FhYOBgRBhAkVXYQJFYQSDVluQUGAgAgFgIIEBkGECWpGQYQSXVltgQFFjcKCCMWDgG4FSYAFgAWCgGwOFgRZgBIMBUpGS' +
  'UF+RgxaQY3CggjGQYCQBYCBgQFGAgwOBhlr6FYAVYQKjVz1fgD49X/1bUFBQUGBAUT1gHxlgH4IBFoIBgGBAUlCBAZBhAseRkGEE' +
  'xFZbkFCAXwNhAtdXUFBhBAVWW2BAUWNusXafYOEbgVJgAWABYKAbA4WBFmAEgwFSMGAkgwFSX5GQhBaQY91i7T6QYEQBYCBgQFGA' +
  'gwOBhlr6FYAVYQMkVz1fgD49X/1bUFBQUGBAUT1gHxlgH4IBFoIBgGBAUlCBAZBhA0iRkGEExFZbkFCBgRAVYQNWV4CRUFuBXwNh' +
  'A2VXUFBQYQQFVltgQFFjI7hy3WDgG4FSYAFgAWCgGwOGgRZgBIMBUoeBFmAkgwFSYESCAYSQUl+RkIUWkGMjuHLdkGBkAWAgYEBR' +
  'gIMDgV+HWvEVgBVhA7xXPV+APj1f/VtQUFBQYEBRPWAfGWAfggEWggGAYEBSUIEBkGED4JGQYQTbVluQUIBhBABXYEBRYxIXHYNg' +
  '4xuBUmAEAWBAUYCRA5D9W1BQUFBbYAEBYQIqVltQUFBQUFZbX4BgIIOFAxIVYQQlV1+A/VuCNWf//////////4CCERVhBDxXX4D9' +
  'W4GFAZFQhWAfgwESYQRPV1+A/VuBNYGBERVhBF1XX4D9W4ZgIIJgBRuFAQERFWEEcVdfgP1bYCCSkJIBlpGVUJCTUFBQUFZbY05I' +
  'e3Fg4BtfUmAyYARSYCRf/VtfYCCChAMSFWEEp1dfgP1bgTVgAWABYKAbA4EWgRRhBL1XX4D9W5OSUFBQVltfYCCChAMSFWEE1Fdf' +
  'gP1bUFGRkFBWW19gIIKEAxIVYQTrV1+A/VuBUYAVFYEUYQS9V1+A/f6iZGlwZnNYIhIgRnJgAfPyO4mIYep684EL9Ms0VtnRRhaV' +
  'Sh07oU3EgLdkc29sY0MACBgAMw==';

export function bytecodeFromB64(b64: string): string {
  const bin = atob(b64);
  let hex = '0x';
  for (let i = 0; i < bin.length; i++) {
    hex += bin.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

export const SWEEPER_BYTECODE = bytecodeFromB64(SWEEPER_B64);
