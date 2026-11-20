// ===== サイト設定 =====
// ここだけ書き換えればOK。データ本体はスプレッドシートで管理します。
window.SITE_CONFIG = {
  title: "UTAてるの 頒布物まとめ（非公式）",
  // Googleスプレッドシートを「ウェブに公開」→ CSV 形式で発行したURLを貼る。
  // 空欄のままなら data/ フォルダのサンプルCSVを読み込みます。
  circlesCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQel03_F6l-S8I9YJjXYRB4NmG2oDfAyTEoNHKUIm0cT0E7J1tMjK94Wzip2kZPwWhT_lKksilN8voY/pub?gid=0&single=true&output=csv",   // 例: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv"
  layoutCsvUrl: "",    // 例: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=123456&single=true&output=csv"
  fallbackCirclesCsv: "data/circles.csv",
  fallbackLayoutCsv: "data/layout.csv",
  // サークルカットがファイル名だけの場合に付けるフォルダ
  cutBasePath: "cuts/",
  // 配置図の列ごとの色（スペース番号の先頭文字）
  rowColors: { A: "#e07a7a", B: "#6fa8dc", C: "#eedd55", D: "#7fcf8a", E: "#a993d6" },
};
