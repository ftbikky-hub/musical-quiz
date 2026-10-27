import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "THEATRE NOTES | 舞台の余韻を、日常に。",
  description:
    "幕が下りても、物語はつづく。劇団四季を中心に、過去のキャスト、公演アーカイブ、公式映像、観劇の思い出をめぐるミュージカルの小さな書斎。",
};

type IconName = "bell" | "cast" | "archive" | "journal" | "play" | "ticket" | "film";

function Icon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    bell: <><path d="M6 16h12l-2-3V9a4 4 0 0 0-8 0v4l-2 3Z" /><path d="M10 19a2 2 0 0 0 4 0M12 3v2M4 7l2-2m14 2-2-2" /></>,
    cast: <><path d="M8 20v-2a4 4 0 0 1 8 0v2M3 19v-1a3 3 0 0 1 3-3m15 4v-1a3 3 0 0 0-3-3" /><circle cx="12" cy="8" r="3" /><path d="M5 7a2.5 2.5 0 0 0 0 5m14-5a2.5 2.5 0 0 1 0 5" /></>,
    archive: <><path d="M4 21h16M6 21V10h12v11M4 10l8-7 8 7M10 21v-6a2 2 0 0 1 4 0v6M8 11v2m8-2v2" /><circle cx="12" cy="9" r="1" /></>,
    journal: <><path d="M5 4h13a1 1 0 0 1 1 1v16H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Zm-1 15a2 2 0 0 1 2-2h13M8 8h7m-7 4h5" /><path d="M15 4v7l-2-1-2 1V4" /></>,
    play: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3V9Z" /></>,
    ticket: <><path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V7Z" /><path d="M15 7v2m0 2v2m0 2v2M7 10h4m-4 4h2" /></>,
    film: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 3v18M16 3v18M4 8h4m-4 8h4m8-8h4m-4 8h4M8 12h8" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} /></svg>;
}

const rooms: { number: string; name: string; english: string; description: string; href: string; icon: IconName; note: string }[] = [
  { number: "01", name: "過去キャストを探す", english: "CAST & COMPANY", description: "あの役を演じたのは、誰だっただろう。演目や役者から配役をたどり、共演のつながりを見つける。", href: "/cast", icon: "cast", note: "演目・役名・出演者から検索" },
  { number: "02", name: "公演の歴史をたどる", english: "STAGE ARCHIVE", description: "作品、劇場、そして時代。1954年から積み重ねられてきた、劇団四季の舞台の足跡をひもとく。", href: "/archive", icon: "archive", note: "作品・会場・日付から検索" },
  { number: "03", name: "観劇の思い出を残す", english: "MY THEATRE JOURNAL", description: "忘れたくない歌声も、心が動いた瞬間も。観た舞台の記録を、自分だけの一冊に。", href: "/theater-log", icon: "journal", note: "記録・写真・振り返り" },
  { number: "04", name: "映像で舞台にふれる", english: "OFFICIAL FILMS", description: "気になる作品や、大好きなあの場面。劇団四季の公式YouTube映像で、舞台の世界をもう一度。", href: "/youtube", icon: "play", note: "公式YouTube動画一覧" },
  { number: "05", name: "ミュージカルで遊ぶ", english: "A LITTLE ENCORE", description: "知っていると、次の観劇がもっと楽しい。ミュージカルのあれこれを、クイズで気軽に。", href: "/quiz.html", icon: "ticket", note: "ミュージカル雑学クイズ" },
  { number: "06", name: "お気に入りを集める", english: "MY COLLECTION", description: "ふと見返したくなる動画、音楽、写真。好きなものをそっと並べる、自分のための小さな棚。", href: "/media", icon: "film", note: "動画・音楽・写真のライブラリ" },
];

export default function Home() {
  return (
    <div className={styles.home}>
      <a className={styles.skipLink} href="#program">コンテンツへスキップ</a>
      <div className={styles.overture}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="THEATRE NOTES トップページ">
            <span className={styles.brandMark}><Icon name="bell" /></span>
            <span className={styles.brandName}>THEATRE NOTES<span>A PERSONAL MUSICAL LIBRARY</span></span>
          </Link>
          <nav className={styles.nav} aria-label="メインナビゲーション">
            <a href="#program">楽しみ方を選ぶ</a>
            <Link href="/theater-log">観劇記録 <Arrow diagonal /></Link>
          </nav>
        </header>

        <main>
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span />FOR THE LOVE OF MUSICALS</p>
              <h1 id="hero-title">幕が下りても、<br />物語は<span className={styles.titleAccent}>つづく。</span></h1>
              <p className={styles.heroDescription}>好きな舞台を、もっと深く。<br />劇団四季を中心に、キャストを調べ、映像にふれ、<br className={styles.desktopBreak} />観劇の思い出を残す、小さなミュージカルの書斎。</p>
              <div className={styles.heroActions}>
                <a href="#program" className={styles.primaryLink}>舞台の世界をめぐる <Arrow /></a>
                <Link href="/theater-log" className={styles.secondaryLink}>観劇を記録する <Arrow diagonal /></Link>
              </div>
              <p className={styles.heroFootnote}>THE STAGE ENDS. THE FEELING STAYS.</p>
            </div>
            <figure className={styles.artwork}>
              {/* Original architectural artwork; no official production imagery. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/bell-tower.svg" width="480" height="530" alt="夜の聖堂に浮かぶ金色の鐘と、薔薇窓から差し込むあたたかな光を描いたイラスト" fetchPriority="high" />
              <figcaption><span>AN ECHO OF NOTRE-DAME</span>鐘の音が、心に残るように。</figcaption>
            </figure>
          </section>
          <div className={styles.interlude} aria-hidden="true"><span /> <span>LES HISTOIRES CONTINUENT</span> <span /></div>

          <section id="program" className={styles.program} aria-labelledby="program-title">
            <div className={styles.programInner}>
              <div className={styles.sectionHeading}>
                <div><p className={styles.sectionEyebrow}>YOUR PERSONAL PROGRAMME</p><h2 id="program-title">今日の余韻は、どこから。</h2></div>
                <p className={styles.sectionIntro}>調べる、残す、もう一度出会う。<br />いまの気分で、お好きな扉から。</p>
              </div>
              <Link href="/lineup" className={styles.lineupEntrance}>
                <span className={styles.roomIcon}><Icon name="ticket" /></span>
                <div><span className={styles.roomEnglish}>THE NEXT CURTAIN CALL</span><h3>次の観劇を、見つけよう。</h3><p>作品と月で見渡す上演予定。気になる公演を、お気に入りに。</p></div>
                <span className={styles.roomArrow}><Arrow diagonal /></span>
              </Link>
              <Link href="/plans" className={styles.lineupEntrance}>
                <span className={styles.roomIcon}><Icon name="journal" /></span>
                <div><span className={styles.roomEnglish}>MY UPCOMING STAGES</span><h3>楽しみが、待っている。</h3><p>私の観劇・コンサートの予定と、抽選締め切り・当落発表をひとつの手帳に。</p></div>
                <span className={styles.roomArrow}><Arrow diagonal /></span>
              </Link>
              <Link href="/activity" className={styles.lineupEntrance}>
                <span className={styles.roomIcon}><Icon name="film" /></span>
                <div><span className={styles.roomEnglish}>MY DAYS & PLACES</span><h3>心が動いた、その場所へ。</h3><p>映画・舞台・コンサート。日時と会場だけでも残せる、お出かけ手帳。</p></div>
                <span className={styles.roomArrow}><Arrow diagonal /></span>
              </Link>
              <div className={styles.roomGrid}>
                {rooms.map((room) => (
                  <Link href={room.href} key={room.href} className={styles.room}>
                    <div className={styles.roomTop}><span className={styles.roomIcon}><Icon name={room.icon} /></span><span className={styles.roomNumber}>{room.number}<span> / 06</span></span></div>
                    <p className={styles.roomEnglish}>{room.english}</p>
                    <h3>{room.name}</h3>
                    <p className={styles.roomDescription}>{room.description}</p>
                    <div className={styles.roomBottom}><span>{room.note}</span><span className={styles.roomArrow}><Arrow diagonal /></span></div>
                  </Link>
                ))}
              </div>
              <aside className={styles.loveNote} aria-label="この場所について">
                <Icon name="bell" />
                <div><p>はじまりは、心に響いたひとつの舞台。</p><span>『ノートルダムの鐘』の余韻を道しるべに。好きな作品が、もっと好きになる場所へ。</span></div>
                <span className={styles.noteSignature}>WITH A LOVE FOR THE STAGE</span>
              </aside>
            </div>
          </section>
        </main>
      </div>
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>THEATRE NOTES<span>舞台の余韻を、日常に。</span></span>
        <p>ミュージカルを楽しむための個人用・非公式サイトです。<br />劇団四季および各作品の権利元とは関係ありません。</p>
        <a href="#hero-title" className={styles.backToTop}>ページの上へ <span aria-hidden="true">↑</span></a>
      </footer>
    </div>
  );
}
