import React, { useEffect, useMemo, useState } from 'react';

export type ReviewAsset = {
  chainId: number;
  chainName: string;
  address: string;
  name: string;
  symbol: string;
  balance: string;
  kind: 'native' | 'erc20';
};

type Props = {
  assets: ReviewAsset[];
  scanning?: boolean;
  onRescan?: () => void;
};

/**
 * Read-only asset review surface.
 *
 * Discovered assets are automatically selected for review. Selection here is
 * presentation-only. It does not approve, transfer, construct calldata, or
 * request a wallet signature.
 */
export default function AllAssetsReview({ assets, scanning = false, onRescan }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const assetKey = (asset: ReviewAsset) => `${asset.chainId}:${asset.address.toLowerCase()}`;

  useEffect(() => {
    setSelected(new Set(assets.map(assetKey)));
  }, [assets]);

  const allSelected = assets.length > 0 && selected.size === assets.length;
  const selectedCount = useMemo(() => selected.size, [selected]);

  function toggleAsset(asset: ReviewAsset) {
    const key = assetKey(asset);
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(assets.map(assetKey)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const grouped = assets.reduce<Record<string, ReviewAsset[]>>((groups, asset) => {
    (groups[asset.chainName] ??= []).push(asset);
    return groups;
  }, {});

  return (
    <section className="all-assets-review" aria-labelledby="all-assets-review-title">
      <div className="all-assets-review__header">
        <div>
          <span className="card-kicker">AUTOMATIC DISCOVERY</span>
          <h2 id="all-assets-review-title">All discovered assets</h2>
          <p>
            {scanning
              ? 'Scanning the connected wallet…'
              : `${assets.length} non-zero asset${assets.length === 1 ? '' : 's'} discovered and ready for review.`}
          </p>
        </div>
        {onRescan && (
          <button type="button" className="wide-button" onClick={onRescan} disabled={scanning}>
            {scanning ? 'Scanning…' : 'Rescan assets'} <span>↻</span>
          </button>
        )}
      </div>

      {assets.length === 0 && !scanning ? (
        <div className="status-line">
          <span className="status-dot" />
          No non-zero assets were returned by the discovery layer.
        </div>
      ) : (
        <div className="all-assets-review__groups">
          {Object.entries(grouped).map(([chainName, chainAssets]) => (
            <div className="all-assets-review__group" key={chainName}>
              <div className="all-assets-review__chain">
                <strong>{chainName}</strong>
                <span>{chainAssets.length} asset{chainAssets.length === 1 ? '' : 's'}</span>
              </div>

              <div className="all-assets-review__list">
                {chainAssets.map(asset => {
                  const key = assetKey(asset);
                  const checked = selected.has(key);

                  return (
                    <article
                      className={`all-assets-review__asset${checked ? ' is-selected' : ''}`}
                      key={key}
                    >
                      <label className="all-assets-review__checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAsset(asset)}
                          aria-label={`Select ${asset.name} (${asset.symbol})`}
                        />
                      </label>
                      <div className="all-assets-review__asset-main">
                        <div className="all-assets-review__icon" aria-hidden="true">
                          {asset.symbol.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <strong>{asset.name}</strong>
                          <span>{asset.symbol} · {asset.kind === 'native' ? 'Native asset' : 'ERC-20'}</span>
                        </div>
                      </div>
                      <div className="all-assets-review__balance">
                        <strong>{asset.balance}</strong>
                        <span>{asset.symbol}</span>
                      </div>
                      {asset.kind === 'erc20' && (
                        <code title={asset.address}>{asset.address}</code>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {assets.length > 0 && !scanning && (
        <div className="all-assets-review__selection" aria-label="Amount review selection controls">
          <div>
            <span className="card-kicker">RECOVERY REVIEW</span>
            <strong>{selectedCount} of {assets.length} selected</strong>
            <span>All discovered balances are included in the review by default. Deselect anything you do not want to review.</span>
          </div>
          <div className="all-assets-review__selection-actions">
            <button type="button" className="wide-button" onClick={selectAll} disabled={allSelected}>
              Select all
            </button>
            <button type="button" className="wide-button" onClick={clearAll} disabled={selectedCount === 0}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="all-assets-review__notice">
        <span aria-hidden="true">✓</span>
        <p>
          Selection is informational only. It does not approve, transfer, or sign
          anything; transaction details should be reviewed separately in the
          connected wallet before approval.
        </p>
      </div>
    </section>
  );
}
