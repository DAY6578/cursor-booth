# releases

QA が PASS したあとの Release Candidate を置く。

置いてよいもの:

- バージョン番号
- 変更履歴の文案
- BOOTH更新文の文案
- 購入者への告知文の文案
- 購入者向け zip

`approved` が付くまで、BOOTH へは出さない。価格変更と購入者への送信も、ここにあるだけでは行わない。

`discord-server-kit.zip` は、`scripts/build-discord-server-kit-zip.py` の出力である。中身は Discord サーバー設計キットの購入者向けファイルだけである。この zip があるだけでは公開しない。
