# arasuka-tools

arasuka BOOTHショップの社内システム。商品の実装はこのリポジトリで行い、役割は分けたままにする。

## 指揮系統

```
Growth / Support
        ↓
   Shop Manager
        ↓
     Cursor
        ↓
    QA Bot
        ↓
   Shop Manager
        ↓
   オーナー承認
        ↓
   BOOTH公開
```

## あなたの仕事

1. 店長Botに「今日は何かある？」と聞く。
2. `cursor-ready` の Issue だけを、このフォルダを開いた Cursor に渡す。
3. QA が PASS したあと、店長が用意した公開文を見て「公開していい？」だけ判断する。

公開、価格変更、購入者への送信は、あなたが承認するまで行わない。

## 誰が何をするか

| 担当 | 場所 | やってよいこと | やってはいけないこと |
| --- | --- | --- | --- |
| Shop Manager | `bots/shop-manager.md` | 仕様化、Issue、公開文の準備 | コードを書く、公開する |
| Support & QA | `bots/support-qa.md` | 問い合わせ下書き、再現、合否判定 | コードを直す、返信を送る |
| Growth | `bots/growth.md` | 調査と店長への提案 | 開発させる、Issueを実装可能にする |
| Cursor | `DEV_RULES.md` | `cursor-ready` の実装 | Issue外の機能追加 |

Grokに渡すのは、各Botファイルのシステムプロンプトだけ。ソースコードは渡さない。

## フォルダ

```
products/          商品の置き場
docs/              仕様、FAQ、変更履歴
research/          Growthの調査メモ
releases/          QA PASS後のRelease Candidate
bots/              Grok 3体のプロンプト
scripts/           購入者zipの組み立て
```

既存の時計は、次の場所のままである。

- `地獄のデジタル時計/` … BOOTH向けの地獄モチーフ
- `ugoku-digital-clock/` … 動くデジタル時計

`products/obs-clock/README.md` が、この2つの索引である。

Discordサーバーの設計・運用キットは `products/discord-server-kit/` にある。購入者向け zip は `scripts/build-discord-server-kit-zip.py` が `releases/discord-server-kit.zip` に作る。`販売ページ/` は入れない。公開はしない。

## ラベル

`bug` `feature` `support` `growth` `release` `P0` `P1` `P2` `cursor-ready` `qa-ready` `approved`

`cursor-ready` が付いていない Issue は、Cursorは実装しない。

`approved` はオーナーだけが付ける。公開してよい印である。

TYPE が IMPROVEMENT の実装Issueは、ラベル `feature` を使い、本文の TYPE に IMPROVEMENT と書く。
