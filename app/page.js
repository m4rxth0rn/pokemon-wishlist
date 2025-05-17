import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.pageBackground}>
      <div className={styles.homeContainer}>
        <h1 className={styles.homeHeading}>🏠 Vítej na Pokémon Wishlistu!</h1>
        <p className={styles.homeParagraph}>Vyber si jednu z možností v navigaci.</p>
      </div>

      <div className={styles.sylveonDecoration}></div>
    </div>
  );
}
