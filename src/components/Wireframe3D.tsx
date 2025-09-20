"use client";
// 日本語コメント: 平面図から得た情報（フロア形状と高さ、フラット屋根のパラペット）で3D線画を生成
import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
// @ts-ignore: 型定義は three の examples に含まれるが環境差異を吸収
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { FloorState } from '@/core/floors'
import { buildFlatRoofWireFromFloor, buildFlatRoofWireStyledFromFloor, buildGableRoofWireStyledFromFloor, cullSegmentsByUpperWalls, mmToM, bboxOfSegments } from '@/core/wireframe-3d'
import { COLORS } from '@/ui/colors'

const toThreeColor = (hex: string) => new THREE.Color(hex)

const Wireframe3D: React.FC<{ floors: FloorState[] }> = ({ floors }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // 日本語コメント: 可視な階のみを対象にワイヤーフレーム線分を集約
  const floorSegments = useMemo(() => {
    return floors.filter(f => f.visible).map(f => {
      const units: any[] = Array.isArray((f as any).roofUnits) ? (f as any).roofUnits : []
      const outer = units.find(u => u && u.footprint?.kind === 'outer')
      const styledRaw = outer?.type === 'gable'
        ? buildGableRoofWireStyledFromFloor(f)
        : buildFlatRoofWireStyledFromFloor(f)
      // 日本語コメント: 上階の壁ボリュームに入り込む屋根線（点線）をカット
      const dashedCulled = cullSegmentsByUpperWalls(floors, f, styledRaw.dashed)
      const styled = { solid: styledRaw.solid, dashed: dashedCulled }
      return {
        floor: f,
        all: buildFlatRoofWireFromFloor(f),
        styled,
      }
    })
  }, [floors])

  useEffect(() => {
    const el = containerRef.current!
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f1113')

    // 日本語コメント: 適度に俯瞰する視点（透視）。対象に合わせて距離を自動調整
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    // 日本語コメント: フロアごとに線分を作成（色は各フロアの壁色、無指定時は COLORS.wall）
    const group = new THREE.Group()
    const geoms: THREE.BufferGeometry[] = []
    const mats: (THREE.LineBasicMaterial | THREE.LineDashedMaterial)[] = []
    for (const entry of floorSegments) {
      const color = entry.floor.color?.walls ?? COLORS.wall
      // 実線
      const positions: number[] = []
      for (const s of entry.styled.solid) {
        positions.push(mmToM(s.a.x), mmToM(s.a.z), mmToM(s.a.y))
        positions.push(mmToM(s.b.x), mmToM(s.b.z), mmToM(s.b.y))
      }
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      const mat = new THREE.LineBasicMaterial({ color: toThreeColor(color) })
      const lines = new THREE.LineSegments(geom, mat)
      group.add(lines)
      geoms.push(geom); mats.push(mat)

      // 点線（パラペット立ち上がり）
      if (entry.styled.dashed.length) {
        const dpos: number[] = []
        for (const s of entry.styled.dashed) {
          dpos.push(mmToM(s.a.x), mmToM(s.a.z), mmToM(s.a.y))
          dpos.push(mmToM(s.b.x), mmToM(s.b.z), mmToM(s.b.y))
        }
        const dgeom = new THREE.BufferGeometry()
        dgeom.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3))
        const dmat = new THREE.LineDashedMaterial({ color: toThreeColor(color), dashSize: 0.15, gapSize: 0.1 })
        const dlines = new THREE.LineSegments(dgeom, dmat)
        // ダッシュ有効化のため距離属性を計算
        // @ts-ignore threeの型ではLineSegmentsにもcomputeLineDistancesあり
        dlines.computeLineDistances?.()
        group.add(dlines)
        geoms.push(dgeom); mats.push(dmat)
      }
    }
    scene.add(group)

    // 日本語コメント: 対象のバウンディングからカメラ距離を算出して全体が収まるように調整
    // バウンディングは実線+点線すべてを対象に算出
    const bb = bboxOfSegments(floorSegments.flatMap(f => [...f.styled.solid, ...f.styled.dashed]))
    let target = new THREE.Vector3(0, 0, 0)
    if (bb) {
      const sizeX = mmToM(bb.max.x - bb.min.x)
      const sizeZ = mmToM(bb.max.z - bb.min.z)
      const sizeY = mmToM(bb.max.y - bb.min.y) // 現状Yは0だが将来拡張に備える
      const radius = Math.max(0.5, Math.max(sizeX, sizeZ) * 0.75)
      const center = new THREE.Vector3(
        mmToM((bb.min.x + bb.max.x) / 2),
        mmToM((bb.min.y + bb.max.y) / 2),
        mmToM((bb.min.z + bb.max.z) / 2),
      )
      group.position.set(-center.x, -center.y, -center.z)
      target = new THREE.Vector3(0, 0, 0)
      const dist = radius / Math.tan((camera.fov * Math.PI / 180) / 2)
      camera.position.set(dist * 0.9, dist * 0.7, dist * 0.9)
      camera.lookAt(0, 0, 0)
    } else {
      camera.position.set(3, 2, 3)
      camera.lookAt(0, 0, 0)
    }

    // 環境光（線色には影響しないが多少の視認性向上）
    const light = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(light)

    // 日本語コメント: インタラクション（回転/パン/ズーム）— OrbitControls を採用
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enableRotate = true
    controls.screenSpacePanning = true
    controls.enablePan = true
    controls.enableZoom = true
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    }
    controls.target.copy(target)
    controls.update()

    // 内部 pan 実装（OrbitControlsのロジックに追随）
    const panOffset = new THREE.Vector3()
    const panLeft = (distance: number, objectMatrix: THREE.Matrix4) => {
      const v = new THREE.Vector3().setFromMatrixColumn(objectMatrix, 0)
      v.multiplyScalar(-distance)
      panOffset.add(v)
    }
    const panUp = (distance: number, objectMatrix: THREE.Matrix4) => {
      const v = new THREE.Vector3()
      if ((controls as any).screenSpacePanning === true) {
        v.setFromMatrixColumn(objectMatrix, 1)
      } else {
        v.setFromMatrixColumn(objectMatrix, 0)
        v.crossVectors((camera as any).up, v)
      }
      v.multiplyScalar(distance)
      panOffset.add(v)
    }
    const panByPixels = (deltaX: number, deltaY: number) => {
      // パースペクティブ時: 目標点距離とFOVからピクセル→ワールド換算
      const offset = new THREE.Vector3().copy(camera.position).sub(controls.target)
      let targetDistance = offset.length()
      targetDistance *= Math.tan((camera.fov / 2) * Math.PI / 180)
      const moveLeft = (2 * deltaX * targetDistance) / Math.max(1, el.clientHeight)
      const moveUp = (2 * deltaY * targetDistance) / Math.max(1, el.clientHeight)
      camera.updateMatrix()
      panLeft(moveLeft, camera.matrix)
      panUp(moveUp, camera.matrix)
      camera.position.add(panOffset)
      controls.target.add(panOffset)
      panOffset.set(0, 0, 0)
    }
    // スクロール（ホイール）: 既定=ズーム（OrbitControls）、Shift+ホイール=パン
    const onWheel = (ev: WheelEvent) => {
      if (!ev.shiftKey) return // OrbitControls に任せてズーム
      ev.preventDefault()
      panByPixels(ev.deltaX, ev.deltaY)
      controls.update()
      renderer.render(scene, camera)
    }
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    // レンダリングループ（軽量、コントロールのダンピングでアニメ）
    let raf = 0
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('wheel', onWheel as any)
      geoms.forEach(g => g.dispose())
      mats.forEach(m => m.dispose())
      renderer.dispose()
      if (renderer.domElement?.parentNode === el) el.removeChild(renderer.domElement)
    }
  }, [floorSegments])

  return <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
}

export default Wireframe3D
