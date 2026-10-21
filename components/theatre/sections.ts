export const sections = [
  { id: "cast", href: "/cast", label: "キャスト", english: "CAST & COMPANY", number: "01", note: "その歌声を、その名前を。舞台を彩る人々に、もう一度出会う。" },
  { id: "archive", href: "/archive", label: "アーカイブ", english: "STAGE ARCHIVE", number: "02", note: "一夜の舞台が、長い物語になる。積み重ねられた公演の記憶をひもとく。" },
  { id: "journal", href: "/theater-log", label: "観劇記録", english: "MY THEATRE JOURNAL", number: "03", note: "拍手のあとの気持ちまで。あなただけの観劇手帳に、今日の一幕を。" },
  { id: "films", href: "/youtube", label: "公式映像", english: "OFFICIAL FILMS", number: "04", note: "あの旋律、あの一瞬。映像の向こうに、また舞台の光がともる。" },
  { id: "quiz", href: "/quiz.html", label: "クイズ", english: "A LITTLE ENCORE", number: "05", note: "好きな舞台のことなら、もう少し。小さなアンコールを楽しもう。" },
  { id: "collection", href: "/media", label: "コレクション", english: "MY COLLECTION", number: "06", note: "好きなものを、好きなだけ。何度でも開きたくなる、自分だけの棚。" },
  { id: "lineup", href: "/lineup", label: "上演予定", english: "THE NEXT CURTAIN CALL", number: "07", note: "次の観劇を、見つけよう。楽しみな舞台が、またひとつ。" },
] as const;
export type SectionId = (typeof sections)[number]["id"] | "account";
