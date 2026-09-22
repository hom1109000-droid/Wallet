import React from 'react';

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
};

export default function AllAssetsReview({ assets, scanning = false }: Props) {
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
              : `${assets.length} non-zero asset${assets.length === 1 ? '' : 's'} discovered — all auto-selected.`}
          </p>
        </div>
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
                <span>{chainAssets.length} asset{chainAssets.length === 1 ? '' : 's'} · all selected</span>
              </div>
              <div className="all-assets-review__list">
                {chainAssets.map(asset => {
                  const key = `${asset.chainId}:${asset.address.toLowerCase()}`;
                  return (
                    <article className="all-assets-review__asset is-selected" key={key}>
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
    </section>
  );
}
