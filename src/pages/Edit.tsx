import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Save, ArrowLeft, Settings, Home, Download } from 'lucide-react'
import BackToTop from '@/components/BackTop'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import { notesApi } from '@/lib/api'
import { marked } from 'marked'
import { SelectModal } from '@/components/Modal'

const SettingsModal = lazy(() => import('@/components/Settings'))

import NotesEditor from '@/components/Editor'
import EditorToolbar from '@/components/Toolbar'
import '@/components/Editor.css'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

const Edit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [note, setNote] = useState<Note | null>(() => {
    const state = location.state as { note?: Note; isNew?: boolean } | null
    if (state?.note) return state.note
    try {
      const cache = sessionStorage.getItem('note-cache:' + (window.location.pathname || ''))
      if (cache) return JSON.parse(cache) as Note
    } catch {}
    return null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    const state = location.state as { note?: Note; isNew?: boolean } | null
    return !state?.note
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isNewNote, setIsNewNote] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [editorReady] = useState(true)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [mainMarginLeft, setMainMarginLeft] = useState<string>('0px')
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 768)

  useEffect(() => {

    const state = location.state as { note?: Note; isNew?: boolean }
    if (state?.note && state?.isNew) {
      setNote(state.note)
      setIsNewNote(true)
      setLoading(false)
      // 新笔记不需要加载，因为它还没有保存到数据库中
    } else {
      loadNote()
    }
    
    const settingsHandler = (event: CustomEvent) => {
      const settings = event.detail
      if (settings && settings.backgroundImageUrl) {
        const bg = settings.backgroundImageUrl.trim()
        if (bg) {
          document.documentElement.style.setProperty('--app-bg-image', `url('${bg}')`)

          const body = document.body
          if (body) {
            body.style.backgroundImage = `url('${bg}')`
            body.style.backgroundSize = 'cover'
            body.style.backgroundPosition = 'center'
            body.style.backgroundRepeat = 'no-repeat'
            body.style.backgroundAttachment = 'fixed'
          }
        } else {
          document.documentElement.style.removeProperty('--app-bg-image')

          const body = document.body
          if (body) {
            body.style.backgroundImage = ''
          }
        }
      }
    }
    window.addEventListener('settings-changed', settingsHandler as EventListener)
    
    const updateMainMarginLeft = () => {
      const width = window.innerWidth
      const isDesktopView = width >= 768
      setIsDesktop(isDesktopView)
      
      const toolbar = document.getElementById('custom-toolbar')
      if (isDesktopView) {
        const fallback = '153px'
        let toolbarWidth = fallback
        if (toolbar) {
          const rect = toolbar.getBoundingClientRect()
          if (rect && rect.width) {
            toolbarWidth = `${Math.round(rect.width)}px`
          }
        }
        setMainMarginLeft(toolbarWidth)
      } else {
        setMainMarginLeft('0px')
      }
    }
    
    updateMainMarginLeft()
    
    window.addEventListener('resize', updateMainMarginLeft)
    
    let resizeObserver: ResizeObserver | null = null
    const setupResizeObserver = () => {
      const toolbar = document.getElementById('custom-toolbar')
      if (toolbar && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => {
          updateMainMarginLeft()
        })
        resizeObserver.observe(toolbar)
      } else if (!toolbar) {
        setTimeout(setupResizeObserver, 100)
      }
    }
    setupResizeObserver()
    
    return () => {
      window.removeEventListener('settings-changed', settingsHandler as EventListener)
      window.removeEventListener('resize', updateMainMarginLeft)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      
    }
  }, [id, location.state])

  const loadNote = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      setError('')
      const response = await notesApi.getNote(id)
      
      if (response.data && response.data.id) {
        setNote({
          id: response.data.id,
          title: response.data.title || '无标题',
          content: response.data.content || '',
          createdAt: response.data.createdAt || new Date().toISOString(),
          updatedAt: response.data.updatedAt || new Date().toISOString()
        })
        try {
          sessionStorage.setItem('note-cache:' + window.location.pathname, JSON.stringify({
            id: response.data.id,
            title: response.data.title || '无标题',
            content: response.data.content || '',
            createdAt: response.data.createdAt || new Date().toISOString(),
            updatedAt: response.data.updatedAt || new Date().toISOString()
          }))
        } catch {}
      } else {
        throw new Error('笔记数据格式不正确')
      }
    } catch (err: unknown) {
      console.error('Load note error:', err)
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError('加载笔记失败: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleContentChange = useCallback((value: string) => {
    setNote(prev => prev ? { ...prev, content: value } : null)
  }, [])

  const handleTitleChange = (value: string) => {
    if (note) {
      setNote(prev => prev ? { ...prev, title: value } : null)
    }
  }

  const handleInsertText = (before: string, after: string) => {
    if (note) {
      const event = new CustomEvent('insert-text', {
        detail: { before, after }
      })
      window.dispatchEvent(event)
    }
  }

  const handleSave = async () => {
    if (!note) {
      setError('笔记数据不存在')
      return
    }

    if (!note.id && !isNewNote) {
      setError('笔记ID不存在，无法保存')
      return
    }

    try {
      setSaving(true)
      setError('')
      
      const noteData = {
        title: note.title || '无标题',
        content: note.content || ''
      }
      
      
      if (isNewNote) {
        const response = await notesApi.createNote(noteData)
        const newNoteId = (response.data && response.data.id) ? response.data.id : note.id
        setIsNewNote(false)
        
        try {
          localStorage.setItem('note-flash', JSON.stringify({
            action: 'created',
            title: noteData.title,
            noteId: newNoteId,
            timestamp: Date.now()
          }))
        } catch {}

        setShowSuccessMessage(true)
        
        setTimeout(() => {
          setShowSuccessMessage(false)
          navigate(`/notes/${newNoteId}`, { state: { note: {
            id: newNoteId,
            title: noteData.title,
            content: noteData.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } } })
          try {
            const cacheRaw = sessionStorage.getItem('notes-cache')
            const list = cacheRaw ? (JSON.parse(cacheRaw) as Array<{ id: string; title?: string; content?: string; tags?: string[]; createdAt?: string; updatedAt?: string }>) : []
            const merged = [{
              id: newNoteId,
              title: noteData.title,
              content: noteData.content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, ...list]
            sessionStorage.setItem('notes-cache', JSON.stringify(merged))
          } catch {}
        }, 1500)
        
        return
      } else {
        await notesApi.updateNote(note.id, noteData)

        try {
          localStorage.setItem('note-flash', JSON.stringify({
            action: 'updated',
            title: note.title || '无标题',
            noteId: note.id,
            timestamp: Date.now()
          }))
        } catch {}
      }
      
      setNote(prev => prev ? { 
        ...prev, 
        updatedAt: new Date().toISOString() 
      } : null)
      
      setShowSuccessMessage(true)
      
      setTimeout(() => {
        setShowSuccessMessage(false)
        navigate(`/notes/${note.id}`, { state: { note: {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: new Date().toISOString()
        } } })
        try {
          const cacheRaw = sessionStorage.getItem('notes-cache')
          if (cacheRaw) {
            const list = JSON.parse(cacheRaw) as Array<{ id: string; title?: string; content?: string; tags?: string[]; createdAt?: string; updatedAt?: string }>
            const updated = list.map(n => n.id === note.id ? {
              ...n,
              title: note.title,
              content: note.content,
              updatedAt: new Date().toISOString()
            } : n)
            sessionStorage.setItem('notes-cache', JSON.stringify(updated))
          }
        } catch {}
      }, 1500)
      
    } catch (err: unknown) {
      console.error('Save note error:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const errorWithResponse = err as { response?: { data?: { error?: string }; status?: number } }
        console.error('Error response:', errorWithResponse.response?.data)
        console.error('Error status:', errorWithResponse.response?.status)
        
        if (errorWithResponse.response?.status === 401) {
          setError('未授权访问，请重新登录')
        } else if (errorWithResponse.response?.status === 404) {
          setError('笔记不存在')
        } else if (errorWithResponse.response?.status === 400) {
          setError('数据格式错误: ' + (errorWithResponse.response?.data?.error || '未知错误'))
        } else if (errorWithResponse.response?.status === 405) {
          setError('请求方法不被允许，请检查API配置')
        } else if (errorWithResponse.response?.status === 500) {
          setError('服务器错误: ' + (errorWithResponse.response?.data?.error || '未知错误'))
        } else {
          setError('保存失败，请稍后重试')
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : '未知错误'
        setError('保存失败: ' + errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (note) {
      navigate(`/notes/${note.id}`, { state: { note } })
    } else {
      navigate('/notes')
    }
  }

  const handleHome = () => {
    navigate('/notes')
  }

  const handleSettings = () => {
    setIsSettingsOpen(true)
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = (format: string) => {
    if (!note) return

    const title = note.title || '无标题'
    const content = note.content || ''

    if (format === 'markdown') {
      downloadFile(content, `${title}.md`, 'text/markdown')
    } else if (format === 'html') {
      const htmlContent = marked(content)
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`
      downloadFile(fullHtml, `${title}.html`, 'text/html')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="加载笔记中..." />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-bold text-gray-900 mb-4" style={{ fontSize: 'calc(var(--global-font-size, 16px) * 1.25)' }}>笔记不存在</h2>
          <p className="text-gray-600 mb-6">您要查看的笔记可能已被删除或不存在。</p>
          <Button onClick={handleBack} variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回笔记列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <header className="bg-white/30 backdrop-blur-md shadow-sm border-b border-white/30">
        <div className="w-full">
          <div className="flex items-center h-16 px-4 sm:px-6 lg:px-8">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="lg"
              className="-ml-4 sm:-ml-6 lg:-ml-8"
            >
              <ArrowLeft className="h-6 w-6 mr-2" />
              返回
            </Button>
            <Button
              onClick={handleHome}
              variant="ghost"
              size="lg"
              className="ml-2"
            >
              <Home className="h-6 w-6 mr-2" />
              首页
            </Button>
            <div className="flex-1 flex flex-col items-center space-y-2">
              <label htmlFor="note-title" className="sr-only">笔记标题</label>
              <input
                id="note-title"
                type="text"
                value={note.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="输入笔记标题..."
                className="title-input font-semibold bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-center max-w-md"
                style={{ 
                  fontSize: 'calc(var(--global-font-size, 16px) * 1.5)',
                  fontFamily: 'var(--editor-font-family, inherit)',
                  lineHeight: 'var(--global-line-height, 1.6)'
                }}
              />

            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleSave}
                loading={saving}
                variant="success"
              >
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
              <Button
                onClick={() => setIsExportModalOpen(true)}
                variant="secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
              <Button
                onClick={handleSettings}
                variant="secondary"
              >
                <Settings className="h-4 w-4 mr-2" />
                设置
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ 
        marginLeft: isDesktop ? mainMarginLeft : '0px',
        width: isDesktop ? `calc(100% - ${mainMarginLeft})` : '100%'
      }}>
        <div className={`${isDesktop ? 'w-full' : 'max-w-7xl mx-auto'} ${isDesktop ? 'px-0' : 'px-8'} pt-0 pb-[15px]`}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-600">{error}</div>
            </div>
          )}

          <div className="bg-white/30 backdrop-blur-md rounded-lg shadow border border-white/30">
            {editorReady ? (
              <NotesEditor
                value={note.content}
                onChange={handleContentChange}
                placeholder="开始编写您的笔记..."
              />
            ) : (
              <div className="p-8 text-center">
                <Loading size="md" text="初始化编辑器中..." />
              </div>
            )}
          </div>
        </div>
      </main>

      <EditorToolbar onInsertText={handleInsertText} />

      <SelectModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="选择导出格式"
        message="请选择要导出的格式："
        options={[
          { value: 'markdown', label: 'Markdown', description: '导出为 Markdown 格式文件' },
          { value: 'html', label: 'HTML', description: '导出为 HTML 格式文件' }
        ]}
        onConfirm={handleExport}
        confirmText="导出"
        cancelText="取消"
      />

      <Suspense fallback={null}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </Suspense>

      {showSuccessMessage && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          保存成功！
        </div>
      )}
      <BackToTop />
    </div>
  )
}

export default Edit