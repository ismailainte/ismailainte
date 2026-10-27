import type { Metadata } from "next";
import { baseURL } from "@/app/resources";
import { InteractiveMap } from "../somali-weyn/InteractiveMap";
import styles from "../somali-weyn/SomaliWeyn.module.scss";

const title = "Somaliland Map | Interactive Horn of Africa Map";
const description =
  "Explore Somaliland and surrounding parts of the Horn of Africa on an interactive map. Zoom, search for towns, and open regions to see districts.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `https://${baseURL}/somaliland` },
  openGraph: {
    title,
    description,
    url: `https://${baseURL}/somaliland`,
    type: "website",
  },
};

export default function SomalilandPage() {
  return (
    <main className={styles.page}>
      <InteractiveMap />
      <section className={styles.seoIntroduction} aria-labelledby="somaliland-map-title">
        <h1 id="somaliland-map-title">Somaliland interactive map</h1>
        <p>
          Explore Somaliland and nearby areas of the Horn of Africa. Zoom in, search for a town,
          or select a region to view its districts and local places.
        </p>
        <p>
          This map covers a wider area than Somaliland, including surrounding parts of Somalia,
          Djibouti, Ethiopia, and Kenya.
        </p>
      </section>
    </main>
  );
}
