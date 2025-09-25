import React from 'react'

export type EditorShellProps = {
  topBar: React.ReactNode
  sidebar: React.ReactNode
  main: React.ReactNode
  inspector?: React.ReactNode
  children?: React.ReactNode
}

// 日本語コメント: エディタ全体の骨組み（上部バー + 左サイドバー + メインビュー + 任意のインスペクタ）
export const EditorShell: React.FC<EditorShellProps> = ({ topBar, sidebar, main, inspector, children }) => {
  return (
    <div className="relative flex h-dvh flex-col bg-surface-base text-text-primary">
      {topBar}
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー領域 */}
        {sidebar}
        {/* メインビュー */}
        <div className="relative flex-1 overflow-hidden bg-surface-canvas">
          {main}
        </div>
        {/* インスペクタ（任意） */}
        {inspector ? (
          <div className="flex-shrink-0">
            {inspector}
          </div>
        ) : null}
      </div>
      {/* 追加要素（隠し入力など） */}
      {children}
    </div>
  )
}

export default EditorShell
