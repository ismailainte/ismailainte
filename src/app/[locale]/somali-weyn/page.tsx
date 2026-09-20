"use client";

import { useState } from "react";
import styles from "./SomaliWeyn.module.scss";

type Territory = {
  id: string;
  name: string;
  center: string;
  color: string;
  path: string;
  label: [number, number];
  regions: string[];
  description: string;
};

const territories: Territory[] = [
  {
    id: "jabuuti",
    name: "Jabuuti",
    center: "Jabuuti",
    color: "#35c7a4",
    path: "M116 92 L190 70 L232 102 L220 150 L171 174 L112 142 Z",
    label: [170, 121],
    regions: ["Jabuuti", "Arta", "Cali Sabiix", "Dikhil", "Tadjourah", "Obock"],
    description: "Qaybta waqooyi-galbeed ee dhulka Soomaalida, kuna teedsan Badda Cas iyo Gacanka Cadmeed."
  },
  {
    id: "waqooyi",
    name: "Waqooyiga Soomaaliya",
    center: "Hargeysa",
    color: "#50b7e8",
    path: "M221 151 L300 112 L438 92 L590 105 L686 151 L641 210 L525 231 L421 220 L326 251 L246 221 Z",
    label: [451, 164],
    regions: ["Awdal", "Woqooyi Galbeed", "Togdheer", "Sanaag", "Sool"],
    description: "Dhulkii loo yiqiin British Somaliland; maanta waa qaybta waqooyi ee Soomaaliya."
  },
  {
    id: "galbeed",
    name: "Soomaali Galbeed",
    center: "Jigjiga",
    color: "#9dcc68",
    path: "M112 143 L171 174 L221 151 L246 221 L326 251 L395 316 L371 398 L400 476 L344 548 L245 522 L160 454 L107 344 L82 225 Z",
    label: [225, 335],
    regions: ["Sitti", "Faafan", "Jarar", "Erer", "Nogob", "Shabeelle", "Qorraxey", "Doollo", "Afdheer", "Liibaan", "Daawa"],
    description: "Deegaannada Soomaalida ee Itoobiya, xarunta maamulkooduna waa Jigjiga."
  },
  {
    id: "koonfur",
    name: "Koonfurta Soomaaliya",
    center: "Muqdisho",
    color: "#4f8fe8",
    path: "M326 251 L421 220 L525 231 L641 210 L613 286 L557 343 L526 421 L484 493 L443 584 L405 665 L344 548 L400 476 L371 398 L395 316 Z",
    label: [486, 356],
    regions: ["Nugaal", "Bari", "Mudug", "Galguduud", "Hiiraan", "Shabeellaha Dhexe", "Banaadir", "Shabeellaha Hoose", "Bay", "Bakool", "Gedo", "Jubbada Dhexe", "Jubbada Hoose"],
    description: "Dhulkii loo yiqiin Italian Somaliland; maanta waa qaybta dhexe iyo koonfurta Soomaaliya."
  },
  {
    id: "nfd",
    name: "NFD / Waqooyi Bari",
    center: "Gaarisa",
    color: "#e6aa4d",
    path: "M160 454 L245 522 L344 548 L405 665 L350 711 L266 690 L194 628 L139 538 Z",
    label: [271, 606],
    regions: ["Mandheera", "Wajeer", "Gaarisa"],
    description: "Gobollada Soomaalidu degto ee waqooyi-bari Kenya, oo taariikh ahaan loo yaqaan NFD."
  }
];

export default function SomaliWeynPage() {
  const [selectedId, setSelectedId] = useState("koonfur");
  const selected = territories.find((territory) => territory.id === selectedId) ?? territories[0];

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <span className={styles.kicker}>KHARIIDAD IS-DHEXGAL AH</span>
        <h1>Soomaali Weyn</h1>
        <p>
          Taabo qayb khariidadda ka mid ah si aad u aragto magaca, xarunta iyo gobollada ku jira.
        </p>
      </header>

      <section className={styles.workspace} aria-label="Khariidadda Soomaali Weyn">
        <div className={styles.mapCard}>
          <div className={styles.mapToolbar}>
            <span>Shanta dhul ee Soomaaliyeed</span>
            <span className={styles.liveDot}>Taabo khariidadda</span>
          </div>

          <svg className={styles.map} viewBox="45 45 680 700" role="img" aria-labelledby="map-title map-description">
            <title id="map-title">Khariidadda is-dhexgalka ah ee Soomaali Weyn</title>
            <desc id="map-description">Shan qaybood oo la taaban karo: Jabuuti, Waqooyiga Soomaaliya, Soomaali Galbeed, Koonfurta Soomaaliya iyo NFD.</desc>
            <defs>
              <filter id="map-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="9" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {territories.map((territory) => {
              const active = territory.id === selected.id;
              return (
                <g
                  key={territory.id}
                  className={active ? styles.activeTerritory : styles.territory}
                  role="button"
                  tabIndex={0}
                  aria-label={territory.name}
                  aria-pressed={active}
                  onClick={() => setSelectedId(territory.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(territory.id);
                    }
                  }}
                >
                  <path d={territory.path} fill={territory.color} filter={active ? "url(#map-glow)" : undefined} />
                  <text x={territory.label[0]} y={territory.label[1]} textAnchor="middle">
                    {territory.name}
                  </text>
                </g>
              );
            })}
            <circle cx="470" cy="435" r="6" className={styles.capitalPoint} />
            <circle cx="171" cy="125" r="5" className={styles.capitalPoint} />
            <circle cx="210" cy="305" r="5" className={styles.capitalPoint} />
            <circle cx="405" cy="165" r="5" className={styles.capitalPoint} />
            <circle cx="275" cy="600" r="5" className={styles.capitalPoint} />
          </svg>

          <div className={styles.legend}>
            {territories.map((territory) => (
              <button key={territory.id} type="button" onClick={() => setSelectedId(territory.id)} aria-pressed={territory.id === selected.id}>
                <i style={{ background: territory.color }} />
                {territory.name}
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.infoCard} aria-live="polite">
          <span className={styles.infoLabel}>QAYBTA LA DOORTAY</span>
          <h2>{selected.name}</h2>
          <div className={styles.centerRow}>
            <span>Xarunta</span>
            <strong>{selected.center}</strong>
          </div>
          <p>{selected.description}</p>
          <h3>Gobollada / aagagga</h3>
          <div className={styles.chips}>
            {selected.regions.map((region) => <span key={region}>{region}</span>)}
          </div>
        </aside>
      </section>

      <p className={styles.note}>
        Xuduudaha khariidaddu waa sawir taariikhi iyo dhaqan ah; looma adeegsanayo go’aan sharci ama xuduud rasmi ah.
      </p>
    </main>
  );
}
