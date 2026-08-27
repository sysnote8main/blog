---
title: マイクラのプラグインに関するGradleのメモ
published: 2026-05-06
description: ちょこっとメモ
tags: [Minecraft, Gradle, PaperMC]
category: minecraft-dev
---

## 完全に個人的なメモです。
- もっとこうしたら簡単になるんじゃないの?
- その書き方って汚くない?

っていうのがあるとは思いますが、プラグイン開発はまだまだ初心者なので...
お手柔らかにお願いします。

## よく使うGradle Plugin
- shadow
	- Gradle Plugins: https://plugins.gradle.org/plugin/com.gradleup.shadow
	- Wiki: https://gradleup.com/shadow/

- run-paper (デバッグ起動用)
	- Gradle Plugins: https://plugins.gradle.org/plugin/xyz.jpenilla.run-paper
	- Github: https://github.com/jpenilla/run-task

- plugin-yml (plugin.ymlの自動生成)
	- Gradle Plugins: https://plugins.gradle.org/plugin/de.eldoria.plugin-yml.bukkit
	- Wiki: https://docs.eldoria.de/pluginyml/

## よく参考にするサイト
- [Paper API - docs](https://docs.papermc.io/paper/dev/api/)
	- PaperAPIの公式ドキュメント
- [Minecraft-Plugin-Template](https://github.com/milkdrinkers/Minecraft-Plugin-Template)
	- Gradleを使ったPaperプラグインのテンプレート
- [Slimefun4 - src/test](https://github.com/Slimefun/Slimefun4/tree/stable/src/test/java/io/github/thebusybiscuit/slimefun4)
	- [MockBukkit](https://github.com/MockBukkit/MockBukkit)とJUnitを使ったテストが沢山ある
- [JSpecify](https://jspecify.dev)
	- `@NonNull`などのアノテーション
- [Spigot Event List](https://spigot-event-list.s7a.dev/ja)
	- Spigotのイベント一覧

## 対応してないJavaバージョンでサーバーを動かしたい
### Jarファイルを実行している場合
`-DPaper.IgnoreJavaVersion=true`をJVM引数に入れればいけるかも
 (もちろん、入れているプラグインのビルド時のJavaバージョンとの競合で動かない場合もある)

### run-paperの場合
`ignoreUnsupportedJvm()`を使えば、上記のオプションを引数に入れたことと同じになって、デバッグ時にも対応してないJavaバージョンで起動できる。
```kotlin
tasks.runServer {
	minecraftVersion("x.x.x")
	ignoreUnsupportedJvm() // <- これ
}
```

## PaperAPI(1.15.2)が依存関係に入らない...
### エラー例
```
> 	Could not resolve net.md-5:bungeecord-chat:1.15-SNAPSHOT.
```

### 原因
こんな感じのエラー(上記)が出ていれば...
多分、maven centralに公開されている`bungeecord-chat`が壊れてるからだと思います。
(なぜか、bungeecord-chatのpomが取得できないっぽい...?)

### 解決策
1. repositoriesの一番上にpapermcのリポジトリをもってくる
2. mavenCentralのcontentブロック内で除外設定をする
	- `excludeModule("net.md-5", "bungeecord-chat")`か`excludeGroup("net.md-5")`を使えばいい感じになると思います。

## CI経由のリリース時にバージョンを変えたい
1. CI環境変数があるなら、VERSION環境変数を参照するようにする
```kotlin
version = if (System.getenv("CI") == "true") {
    // If in CI environment, it requires VERSION from env.
    System.getenv("VERSION") ?: error("Failed to get version from environment")
} else {
    "0.1.0-SNAPSHOT"
}
```
2. gradle.propertiesを書き換える
	- git commitとかしたいなら、これもいいかもしれない...? (やったことないけど)

