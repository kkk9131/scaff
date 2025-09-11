name: 機能リクエスト
description: 新機能または改善提案
title: "feat: [短い要約]"
labels: [enhancement]
body:
  - type: textarea
    attributes:
      label: 背景/課題
    validations:
      required: true
  - type: textarea
    attributes:
      label: 提案内容
      description: 可能ならUIやAPIのイメージ、制約、非機能要件も
    validations:
      required: true
  - type: textarea
    attributes:
      label: 代替案/検討済み
  - type: checkboxes
    attributes:
      label: 確認チェックリスト
      options:
        - label: MVP/ロードマップとの整合を確認
        - label: 仕様案を docs/ に反映（必要に応じて）
        - label: activity.log に要約を追加
