"use client";
// 日本語コメント: Three.js + postprocessing の最小プレースホルダー
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'postprocessing'
import { RenderPass } from 'postprocessing'

export default function ThreePlaceholder() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current!
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f1113')

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.set(2.8, 2.2, 2.8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    // 日本語コメント: ワイヤーフレームのキューブ
    const geo = new THREE.BoxGeometry(1, 1, 1)
    // 壁色のポリシーに合わせてネオンブルー
    const mat = new THREE.MeshBasicMaterial({ color: 0x35a2ff, wireframe: true })
    const cube = new THREE.Mesh(geo, mat)
    scene.add(cube)

    const light = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(light)

    // 日本語コメント: postprocessing のコンポーザー（現状は RenderPass のみ）
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    let raf = 0
    const animate = () => {
      cube.rotation.y += 0.01
      cube.rotation.x += 0.005
      composer.render()
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      composer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      composer.dispose()
      renderer.dispose()
      el.removeChild(renderer.domElement)
      geo.dispose()
      mat.dispose()
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
