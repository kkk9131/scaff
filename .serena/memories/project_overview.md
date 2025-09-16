## プロジェクト概要
- 目的: 2D平面図エディタMVPの開発。寸法線常時表示や軒の外周オフセットなど建設向け要件に対応する。
- 技術スタック: Next.js 14 + React 18 + TypeScript、Tailwind CSS、Radix UI、Three.js/Postprocessing（将来の3D機能想定）。
- コード構成: `src/` 配下にドメイン別モジュール（core/ui/io/components/app/lib）。ドキュメントは `docs/`、テストは `tests/`、アセットは `assets/` に配置。
- ドキュメントファースト: `docs/` の日英仕様がソース・オブ・トゥルース。コード変更時は仕様も更新する。
- アクションログ: セッションごとに `activity.log` へ日本語で追記。
