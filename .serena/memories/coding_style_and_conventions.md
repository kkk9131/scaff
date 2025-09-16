## コーディング規約
- インデント: JS/TS は2スペース、Pythonは4スペース。ファイル名はJS/TS資産がケバブケース、Pythonはスネークケース。
- コメント: 意図や前提を日本語で簡潔に残す。UI/仕様の変更も日本語デフォルト。
- モジュール設計: 単一責務・小さなファイルを心掛け、core/ui/ioなどレイヤーを分離。
- ドキュメント: EN/JA両言語を常に同期。`README.md` と `README.ja.md` などを併記。
- Git運用: Conventional Commits、約300行以内のPR、Squash Merge推奨。ブランチは `feature/*` などケバブケース。
