'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Save, RefreshCw, CheckCircle, AlertCircle, Loader2,
  ChevronRight, ChevronDown, Info, FolderOpen, Folder,
} from 'lucide-react'
import { adminFetch } from '@/lib/admin-fetch'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface FileEntry { name: string; size: number }

// File icon mapping (VS Code style)
function fileIcon(name: string): string {
  if (name === '.env') return '🔑'
  if (name.startsWith('.env')) return '📄'
  if (name === '.gitignore' || name === '.dockerignore') return '🔒'
  if (name.endsWith('.json')) return '📋'
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return '📘'
  if (name.endsWith('.md')) return '📝'
  if (name.endsWith('.yml') || name.endsWith('.yaml') || name.endsWith('.toml') || name.endsWith('.jsonc')) return '⚙️'
  if (name === 'Dockerfile') return '🐳'
  if (name.endsWith('.mjs') || name.endsWith('.js')) return '📙'
  if (name.endsWith('.css')) return '🎨'
  return '📄'
}

// Format bytes to locale string with comma separators
function fmtSize(n: number): string {
  return n.toLocaleString('en-US')
}

// .env syntax highlighting
function EnvLine({ line, index }: { line: string; index: number }) {
  const trimmed = line.trim()
  if (trimmed.startsWith('#')) {
    return (
      <div className="flex min-w-0">
        <span className="select-none w-10 shrink-0 text-right pr-4 text-[#495162] text-xs leading-6">{index + 1}</span>
        <span className="text-[#6a9955] text-xs leading-6 whitespace-pre break-all">{line}</span>
      </div>
    )
  }
  if (trimmed === '') {
    return (
      <div className="flex min-w-0">
        <span className="select-none w-10 shrink-0 text-right pr-4 text-[#495162] text-xs leading-6">{index + 1}</span>
        <span className="text-xs leading-6">&nbsp;</span>
      </div>
    )
  }
  const eqIdx = line.indexOf('=')
  if (eqIdx !== -1) {
    const key = line.slice(0, eqIdx)
    const val = line.slice(eqIdx + 1)
    const isDb = key === 'DATABASE_URL'
    return (
      <div className={`flex min-w-0 group ${isDb ? 'bg-amber-500/5 rounded' : ''}`}>
        <span className="select-none w-10 shrink-0 text-right pr-4 text-[#495162] text-xs leading-6">{index + 1}</span>
        <span className="text-xs leading-6 whitespace-pre-wrap break-all flex-1">
          <span className={isDb ? 'text-[#9cdcfe] font-bold' : 'text-[#9cdcfe]'}>{key}</span>
          <span className="text-[#d4d4d4]">=</span>
          <span className={isDb ? 'text-[#ce9178] font-semibold' : 'text-[#ce9178]'}>{val}</span>
        </span>
        {isDb && (
          <span className="shrink-0 ml-2 text-[10px] text-amber-400 leading-6 opacity-70 pr-2">← DB</span>
        )}
      </div>
    )
  }
  return (
    <div className="flex min-w-0">
      <span className="select-none w-10 shrink-0 text-right pr-4 text-[#495162] text-xs leading-6">{index + 1}</span>
      <span className="text-[#d4d4d4] text-xs leading-6 whitespace-pre-wrap break-all">{line}</span>
    </div>
  )
}

export function EnvEditorClient() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [mtime, setMtime] = useState('')
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [loadingEnv, setLoadingEnv] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [editMode, setEditMode] = useState(false)
  const [projectOpen, setProjectOpen] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = content !== originalContent

  useEffect(() => {
    loadFiles()
    loadEnv()
  }, [])

  async function loadFiles() {
    setLoadingFiles(true)
    try {
      const res = await adminFetch('/api/admin/file-list')
      const data = await res.json().catch(() => ({})) as { files?: FileEntry[]; error?: string }
      if (!res.ok) {
        toast.error(data.error || 'Failed to load files')
        return
      }
      setFiles(data.files ?? [])
    } catch {
      toast.error('Failed to load files')
    } finally {
      setLoadingFiles(false)
    }
  }

  async function loadEnv() {
    setLoadingEnv(true)
    try {
      const res = await adminFetch('/api/admin/env-file')
      const data = await res.json().catch(() => ({})) as { content?: string; size?: number; mtime?: string | null; error?: string }
      if (!res.ok) {
        toast.error(data.error || 'Failed to load .env file')
        return
      }
      setContent(data.content ?? '')
      setOriginalContent(data.content ?? '')
      setFileSize(data.size ?? 0)
      if (data.mtime) setMtime(new Date(data.mtime).toLocaleString('ar-SA'))
    } catch {
      toast.error('Failed to load .env file')
    } finally {
      setLoadingEnv(false)
    }
  }

  async function saveEnv() {
    setSaveStatus('saving')
    try {
      const res = await adminFetch('/api/admin/env-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; size?: number }
      if (res.ok && data.ok) {
        setOriginalContent(content)
        setFileSize(data.size ?? fileSize)
        setSaveStatus('saved')
        setEditMode(false)
        setMtime(new Date().toLocaleString('ar-SA'))
        void loadFiles()
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        toast.error(data.error || 'Save failed')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveEnv()
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = content.slice(0, start) + '  ' + content.slice(end)
      setContent(newVal)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2 })
    }
  }

  const lines = content.split('\n')

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[520px] rounded-2xl border border-[#2d2d2d] overflow-hidden bg-[#1e1e1e] shadow-2xl">

      {/* ── Activity Bar ── */}
      <div className="w-10 shrink-0 bg-[#333333] flex flex-col items-center pt-2 border-r border-[#252526]">
        <div className="grid h-8 w-8 place-items-center text-[#cccccc] mt-1" title="Explorer">
          <svg viewBox="0 0 16 16" className="h-5 w-5 fill-current"><path d="M1.5 1h5l2 2H14a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V1.5A.5.5 0 0 1 1.5 1z"/></svg>
        </div>
      </div>

      {/* ── File Explorer Sidebar ── */}
      <div className="w-56 shrink-0 bg-[#252526] border-r border-[#2d2d2d] flex flex-col select-none">

        {/* Explorer header */}
        <div className="px-3 py-[7px] text-[10px] font-bold tracking-widest text-[#bbbcbd] uppercase border-b border-[#2d2d2d] shrink-0">
          Explorer
        </div>

        {/* Folder toggle */}
        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="flex w-full items-center gap-1 px-2 py-[5px] text-[11px] font-semibold tracking-wider text-[#cccccc] hover:bg-[#2a2d2e] uppercase shrink-0"
        >
          {projectOpen
            ? <><ChevronDown className="h-3 w-3 shrink-0" /><FolderOpen className="h-3.5 w-3.5 text-[#dcb67a] shrink-0" /></>
            : <><ChevronRight className="h-3 w-3 shrink-0" /><Folder className="h-3.5 w-3.5 text-[#dcb67a] shrink-0" /></>}
          <span className="ml-1 truncate">FF-DIAMOND</span>
        </button>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {projectOpen && (
            loadingFiles ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-[#858585]" />
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {files.map((f) => {
                    const isEnv = f.name === '.env'
                    return (
                      <tr
                        key={f.name}
                        className={[
                          'cursor-default',
                          isEnv
                            ? 'bg-[#094771] text-white'
                            : 'text-[#cccccc] hover:bg-[#2a2d2e]',
                        ].join(' ')}
                      >
                        {/* Icon + Name */}
                        <td className="pl-6 pr-1 py-[2px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] leading-none shrink-0">{fileIcon(f.name)}</span>
                            <span className="text-[12px] truncate font-mono">{f.name}</span>
                            {isEnv && isDirty && (
                              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            )}
                          </div>
                        </td>
                        {/* Size */}
                        <td className="pr-3 py-[2px] text-right text-[11px] text-[#858585] font-mono tabular-nums whitespace-nowrap shrink-0">
                          {fmtSize(f.size)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2d2d2d] px-3 py-1.5 text-[10px] text-[#555] shrink-0">
          {mtime && <p className="truncate">{mtime}</p>}
        </div>
      </div>

      {/* ── Editor Pane ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center bg-[#2d2d2d] border-b border-[#252526] shrink-0">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#1e1e1e] text-[#cccccc] text-[12px] border-r border-[#252526] border-t-2 border-t-[#0078d4]">
            <span className="text-sm">{fileIcon('.env')}</span>
            <span className="font-mono">.env</span>
            {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ml-1" />}
          </div>
          <div className="flex-1" />
          {/* Actions */}
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={() => { setEditMode(!editMode); if (!editMode) setTimeout(() => textareaRef.current?.focus(), 50) }}
              className={[
                'flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                editMode
                  ? 'bg-[#0078d4]/30 text-[#4fc1ff] hover:bg-[#0078d4]/40'
                  : 'text-[#cccccc] hover:bg-[#3c3c3c]',
              ].join(' ')}
            >
              ✏️ {editMode ? 'تحرير' : 'تعديل'}
            </button>
            {isDirty && (
              <button
                onClick={saveEnv}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-1 rounded bg-[#0078d4] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#1084d8] disabled:opacity-60 transition-colors"
              >
                {saveStatus === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                حفظ
              </button>
            )}
            <button
              onClick={() => { loadEnv(); loadFiles() }}
              className="grid h-6 w-6 place-items-center rounded text-[#858585] hover:bg-[#3c3c3c] hover:text-white transition-colors"
              title="Reload"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Notification bars */}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 bg-emerald-900/50 border-b border-emerald-700/40 px-4 py-1.5 text-[11px] text-emerald-300 shrink-0">
            <CheckCircle className="h-3 w-3 shrink-0" />
            تم الحفظ — أعد تشغيل الخادم لتطبيق التغييرات
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 bg-rose-900/50 border-b border-rose-700/40 px-4 py-1.5 text-[11px] text-rose-300 shrink-0">
            <AlertCircle className="h-3 w-3 shrink-0" />
            فشل الحفظ — حاول مجدداً
          </div>
        )}
        {editMode && (
          <div className="flex items-center gap-2 bg-[#0078d4]/10 border-b border-[#0078d4]/20 px-4 py-1.5 text-[11px] text-[#4fc1ff] shrink-0">
            <Info className="h-3 w-3 shrink-0" />
            وضع التحرير — Ctrl+S للحفظ السريع
          </div>
        )}

        {/* Code area */}
        <div className="relative flex-1 overflow-hidden bg-[#1e1e1e]">
          {loadingEnv ? (
            <div className="flex h-full items-center justify-center gap-2 text-[#858585] text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري التحميل…
            </div>
          ) : editMode ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="absolute inset-0 h-full w-full resize-none bg-transparent py-3 text-[#d4d4d4] text-xs leading-6 outline-none caret-white font-mono"
              style={{ paddingLeft: '44px' }}
            />
          ) : (
            <div className="h-full overflow-auto py-3">
              {lines.map((line, i) => (
                <EnvLine key={i} line={line} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#007acc] px-3 py-[2px] text-[10px] text-white shrink-0">
          <span className="flex items-center gap-2 font-mono">
            <span>UTF-8</span>
            <span className="opacity-50">|</span>
            <span>{lines.length} سطر</span>
            <span className="opacity-50">|</span>
            <span>{fmtSize(fileSize)} bytes</span>
          </span>
          <span className="flex items-center gap-2">
            <span>.env — Environment Variables</span>
            {isDirty && <span className="rounded bg-white/20 px-1.5 py-0.5">● غير محفوظ</span>}
          </span>
        </div>
      </div>
    </div>
  )
}
