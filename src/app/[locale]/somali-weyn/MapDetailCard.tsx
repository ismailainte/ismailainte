"use client";

import type { LegendDetail } from "./MapLegend";
import styles from "./SomaliWeyn.module.scss";

/**
 * The in-map panel is drawn in map units, so on a phone its type is a few pixels
 * tall. Below that width the panel is hidden and this HTML card carries the same
 * information at a readable size.
 */
export function MapDetailCard({ detail }: { detail?: LegendDetail }) {
  return (
    <aside className={styles.detailCard} aria-live="polite">
      <p className={styles.detailKicker}>{detail ? detail.kicker : "MAP"}</p>
      <h2 className={styles.detailTitle}>{detail ? detail.title : "Soomaali Weyn"}</h2>
      <dl className={styles.detailRows}>
        {detail ? (
          detail.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))
        ) : (
          <div>
            <dt>Tip</dt>
            <dd>Tap a region to open it</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
