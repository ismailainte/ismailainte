import { InteractiveMap } from "./InteractiveMap";
import styles from "./SomaliWeyn.module.scss";

export const metadata = {
  title: "Soomaali Weyn — Interactive Map",
  description:
    "Interactive physical map of Soomaali Weyn: zoom, pan and open any region to see its districts.",
};

export default function SomaliWeynPage() {
  return (
    <main className={styles.page}>
      <InteractiveMap />
    </main>
  );
}
