// ===== サイト設定 =====
// ここだけ書き換えればOK。データ本体はスプレッドシートで管理します。
window.SITE_CONFIG = {
  title: "UTAてるの 頒布物まとめ（非公式）",
  // Googleスプレッドシートを「ウェブに公開」→ CSV 形式で発行したURLを貼る。
  // 空欄のままなら data/ フォルダのサンプルCSVを読み込みます。
  circlesCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQel03_F6l-S8I9YJjXYRB4NmG2oDfAyTEoNHKUIm0cT0E7J1tMjK94Wzip2kZPwWhT_lKksilN8voY/pub?gid=0&single=true&output=csv",   // 例: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv"
  layoutCsvUrl: "",    // 例: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=123456&single=true&output=csv"
  // 概要タブの内容（見出し,本文 の2列）。空欄なら data/about.csv を使用
  aboutCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQel03_F6l-S8I9YJjXYRB4NmG2oDfAyTEoNHKUIm0cT0E7J1tMjK94Wzip2kZPwWhT_lKksilN8voY/pub?gid=740890788&single=true&output=csv",
  fallbackCirclesCsv: "data/circles.csv",
  fallbackAboutCsv: "data/about.csv",
  fallbackLayoutCsv: "data/layout.csv",
  // サークルカットがファイル名だけの場合に付けるフォルダ
  cutBasePath: "cuts/",
  // サークル一覧のブロック見出しの色（配置図の色と同じ）
  blockColors: { A: "#e8b4b4", B: "#c3dcf2", C: "#fefbd6", D: "#dcf5de", E: "#e3d9f3" },
};
