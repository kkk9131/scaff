name: 不具合報告
description: バグの再現手順と期待動作を記載してください
title: "fix: [短い要約]"
labels: [bug]
body:
  - type: textarea
    attributes:
      label: 概要
      description: 何が問題ですか？
      placeholder: 例）寸法線の表示がズレる
    validations:
      required: true
  - type: textarea
    attributes:
      label: 再現手順
      description: 手順を番号で記載
      placeholder: |
        1. 〜を開く
        2. 〜をクリック
        3. 〜が発生
    validations:
      required: true
  - type: textarea
    attributes:
      label: 期待する動作
    validations:
      required: true
  - type: textarea
    attributes:
      label: スクリーンショット/ログ
  - type: checkboxes
    attributes:
      label: 確認チェックリスト
      options:
        - label: 既存Issueに重複がないことを確認
        - label: 最小の再現手順を記載
        - label: 関連ドキュメントがあればリンク
        - label: activity.log に要約を追加
