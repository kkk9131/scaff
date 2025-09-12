// 日本語コメント: snap コア関数の最小テスト（手動実行用）
// ランナー未導入のため、将来的に Vitest/Jest へ移行予定。

import { applySnaps, SNAP_DEFAULTS, snapToGrid, snapToOrtho } from '@/core/snap'

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

// グリッド
{
  const p = { x: 123, y: -74 }
  const g = snapToGrid(p, 50)
  console.assert(g.x === 100 && g.y === -100, 'grid snap failed')
}

// 直角（水平: yを吸着）
{
  const p = { x: 100, y: 5 }
  const q = snapToOrtho(p, { x: 0, y: 0 }, 10)
  console.assert(approx(q.y, 0), 'ortho horizontal failed')
}

// 直角（垂直: xを吸着）
{
  const p = { x: 5, y: 100 }
  const q = snapToOrtho(p, { x: 0, y: 0 }, 10)
  console.assert(approx(q.x, 0), 'ortho vertical failed')
}

// 複合（直角→グリッド）
{
  const p = { x: 102, y: 3 } // 水平に寄っている→y=0 吸着→x を 50 粒度に丸め
  const q = applySnaps(p, { ...SNAP_DEFAULTS, gridMm: 50, anchor: { x: 0, y: 0 } })
  console.assert(q.y === 0 && q.x === 100, 'applySnaps failed')
}

console.log('snap.spec.ts OK')

