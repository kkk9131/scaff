name: ドキュメント
description: ドキュメントの追加/修正/翻訳
title: "docs: [短い要約]"
labels: [documentation]
body:
  - type: textarea
    attributes:
      label: 対象ドキュメント
      placeholder: 例）docs/作図エディタ要件定義書.md の〜章
    validations:
      required: true
  - type: textarea
    attributes:
      label: 変更内容
    validations:
      required: true
  - type: checkboxes
    attributes:
      label: 確認チェックリスト
      options:
        - label: 英日両方の整合を確認
        - label: 参照リンク/画像の更新
        - label: activity.log に要約を追加
