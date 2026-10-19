"use client";

import { useState } from "react";
import { AutocompleteSearch } from "./AutocompleteSearch";
import { fetchAllArchiveActorOptions, fetchAllArchiveRoleOptions, fetchAllArchiveStaffOptions, fetchAllArchiveWorkOptions, fetchAllArchiveVenueOptions } from "@/app/archive/queries";
import styles from "./library.module.css";

const categories = [
  { name: "作品", label: "作品名", placeholder: "例：ノートルダムの鐘", fetch: fetchAllArchiveWorkOptions },
  { name: "出演者", label: "出演者名（芸名・旧名を含む）", placeholder: "例：市村、飯田 達郎", fetch: fetchAllArchiveActorOptions },
  { name: "役", label: "役名・作品名", placeholder: "例：カジモド、マリア", fetch: fetchAllArchiveRoleOptions },
  { name: "スタッフ", label: "スタッフ名", placeholder: "例：浅利", fetch: fetchAllArchiveStaffOptions },
  { name: "劇場", label: "劇場・会場名", placeholder: "例：自由劇場、京都", fetch: fetchAllArchiveVenueOptions },
];

export function LibrarySearch() {
  const [category, setCategory] = useState(0);
  const current = categories[category];
  return <section className={styles.searchDesk} aria-labelledby="library-search-heading">
    <div className={styles.deskHeading}><span className={styles.eyebrow}>THE READING DESK</span><h2 id="library-search-heading">気になる名前から、ひもとく。</h2></div>
    <div className={styles.categories} role="group" aria-label="検索する種類">
      {categories.map((item, index) => <button key={item.name} type="button" aria-pressed={index === category} onClick={() => setCategory(index)}>{item.name}</button>)}
    </div>
    <AutocompleteSearch key={current.name} label={current.label} placeholder={current.placeholder} fetchAllOptions={current.fetch}/>
  </section>;
}
