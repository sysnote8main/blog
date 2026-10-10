declare module "prismjs/components/index.js" {
  /**
   * Prism の言語コンポーネントを依存関係ごと読み込む。
   * 引数を省略すると利用可能な全言語をロードする。
   */
  function loadLanguages(languages?: string | string[]): void;

  namespace loadLanguages {
    let silent: boolean;
  }

  export = loadLanguages;
}
