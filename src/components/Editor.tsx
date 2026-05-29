import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import SimpleMDE from 'react-simplemde-editor'
import 'easymde/dist/easymde.min.css'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import 'prosemirror-view/style/prosemirror.css'
import './Editor.css'

interface CodeMirrorInstance {
  getValue: () => string
  setValue: (value: string) => void
  getCursor: () => { line: number; ch: number }
  setCursor: (cursor: { line: number; ch: number }) => void
  focus: () => void
  getSelection: () => string
  replaceSelection: (text: string) => void
  replaceRange: (text: string, from: { line: number; ch: number }) => void
  refresh: () => void
  getWrapperElement: () => HTMLElement
  on: (event: string, handler: () => void) => void
  off: (event: string, handler: () => void) => void
  triggerOnKeyDown: (event: KeyboardEvent) => void
}

interface SimpleMDEInstance {
  codemirror?: CodeMirrorInstance
  isPreviewActive: () => boolean
  togglePreview: () => void
}

interface EditorProps {
  value: string
  onChange: (_value: string) => void
  placeholder?: string
}

const Editor: React.FC<EditorProps> = ({ 
  value, 
  onChange, 
  placeholder = '开始编写您的笔记...'
}) => {
  const mdeRef = useRef<{ simpleMde?: SimpleMDEInstance } | null>(null) as React.MutableRefObject<{ simpleMde?: SimpleMDEInstance } | null>
  const [isPreview, setIsPreview] = useState(false)
  const [_showScroll, _setShowScroll] = useState(true)
  const [editorInstance, setEditorInstance] = useState<SimpleMDEInstance | null>(null)
  const [editMode, setEditMode] = useState<'markdown' | 'rich'>('markdown')
  
  // 简单的 Markdown 到 HTML 转换
  const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '<p><br /></p>'

    const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    let html = normalized

    // 替换标题
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')

    // 替换粗体
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')

    // 替换斜体
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')

    // 替换删除线
    html = html.replace(/~~(.*?)~~/gim, '<s>$1</s>')

    // 替换代码块
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')

    // 替换引用
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

    // 替换连续的无序列表项
    html = html.replace(/(^|\n)(- .+(?:\n- .+)*)/gm, (_, prefix, group) => {
      const items = group.split('\n').map((line: string) => line.replace(/^- /, '').trim())
      return `${prefix}<ul>${items.map((item: string) => `<li>${item}</li>`).join('')}</ul>`
    })

    // 替换连续的有序列表项
    html = html.replace(/(^|\n)(\d+\. .+(?:\n\d+\. .+)*)/gm, (_, prefix, group) => {
      const items = group.split('\n').map((line: string) => line.replace(/^\d+\. /, '').trim())
      return `${prefix}<ol>${items.map((item: string) => `<li>${item}</li>`).join('')}</ol>`
    })

    // 按空行分段落并保留单行换行
    return html
      .split(/\n{2,}/g)
      .map((block) => {
        const trimmed = block.trim()
        if (!trimmed) return '<p><br /></p>'
        if (/^<(h[1-6]|ul|ol|blockquote|pre)>/i.test(trimmed)) {
          return trimmed
        }
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
      })
      .join('')
  }
  
  // 简单的 HTML 到 Markdown 转换
  const convertHtmlToMarkdown = (html: string): string => {
    if (!html) return ''
    
    // 保留段落边界
    let markdown = html.replace(/<\/p>\s*<p>/gims, '\n\n')

    // 移除段落标签
    markdown = markdown.replace(/<p>(.*?)<\/p>/gims, '$1')
    
    // 替换 <br> 为换行符
    markdown = markdown.replace(/<br\s*\/?>/gim, '\n')
    
    // 替换标题
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/gim, '# $1')
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/gim, '## $1')
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/gim, '### $1')
    
    // 替换粗体
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/gim, '**$1**')
    
    // 替换斜体
    markdown = markdown.replace(/<em>(.*?)<\/em>/gim, '*$1*')
    
    // 替换删除线
    markdown = markdown.replace(/<s>(.*?)<\/s>/gim, '~~$1~~')
    
    // 替换代码块
    markdown = markdown.replace(/<pre><code>(.*?)<\/code><\/pre>/gims, '```$1```')
    
    // 替换引用
    markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/gim, '> $1')
    
    // 替换无序列表
    markdown = markdown.replace(/<ul>([\s\S]*?)<\/ul>/gim, (_match: string, inner: string) => {
      return inner.replace(/<li>(.*?)<\/li>/gim, '- $1\n').trim()
    })
    
    // 替换有序列表
    markdown = markdown.replace(/<ol>([\s\S]*?)<\/ol>/gim, (_match: string, inner: string) => {
      let index = 1
      return inner.replace(/<li>(.*?)<\/li>/gim, (_match: string, content: string) => `${index++}. ${content}\n`).trim()
    })
    
    return markdown.replace(/\n{3,}/g, '\n\n').trim()
  }
  
  const localUpdateRef = useRef(false)
  const latestValueRef = useRef(value)

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  // Tiptap editor
  const tiptapEditor = useEditor({
    extensions: [
      StarterKit
    ],
    content: convertMarkdownToHtml(value), // 转换 Markdown 为 HTML
    onUpdate: ({ editor }) => {
      try {
        // 获取 HTML 内容并转换为 Markdown
        const html = editor.getHTML()
        const markdown = convertHtmlToMarkdown(html)
        // 只有当内容发生变化时才调用 onChange，避免无限循环
        if (markdown !== latestValueRef.current) {
          localUpdateRef.current = true
          // 使用 setTimeout 避免同步更新导致的无限循环
          setTimeout(() => {
            onChange(markdown)
            setTimeout(() => {
              localUpdateRef.current = false
            }, 0)
          }, 0)
        }
      } catch (error) {
        console.warn('获取编辑器内容失败:', error)
      }
    },
    editorProps: {
      attributes: {
        class: 'max-w-none min-h-[550px]'
      },
      handleKeyDown: () => {
        // 让 Tiptap 默认处理 Enter 换行，避免光标跳转到错误位置
        return false
      }
    }
  })
  
  // 当编辑模式切换时，确保 Tiptap 编辑器更新内容
  useEffect(() => {
    if (editMode === 'rich' && tiptapEditor && !localUpdateRef.current) {
      const html = convertMarkdownToHtml(value)
      // 仅在编辑器当前内容与传入内容不同时才同步
      if (tiptapEditor.getHTML() !== html) {
        tiptapEditor.commands.setContent(html)
      }
      const editorHasFocus = tiptapEditor.view?.hasFocus?.() ?? false
      if (!editorHasFocus) {
        tiptapEditor.commands.focus()
      }
    }
  }, [editMode, value, tiptapEditor])
  
  // 当内容变化时，确保 Tiptap 编辑器不会因为空内容而闪烁
  useEffect(() => {
    if (editMode === 'rich' && tiptapEditor) {
      // 确保编辑器始终有内容
      if (!value || value.trim() === '') {
        tiptapEditor.commands.setContent('<p><br /></p>')
      }
    }
  }, [editMode, value, tiptapEditor])
  
  const getEditor = useCallback(() => {
    if (mdeRef.current && mdeRef.current.simpleMde) {
      return mdeRef.current.simpleMde
    }
    return null
  }, [])

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue)
    
    const editor = getEditor()
    if (editor && editor.codemirror) {
      const cm = editor.codemirror
      setTimeout(() => {
        const cursor = cm.getCursor()
        cm.setCursor(cursor)
        cm.focus()
        // 强制刷新光标
        cm.refresh()
      }, 0)
    }
  }, [onChange, getEditor])

  const handlePaste = useCallback(async (cm: CodeMirrorInstance) => {
    try {
      const clipboardData = await navigator.clipboard.readText()
      
      const processedText = clipboardData
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
      
      const cursor = cm.getCursor()
      const selection = cm.getSelection()
      
      if (selection) {
        cm.replaceSelection(processedText)
      } else {
        cm.replaceRange(processedText, cursor)
      }
      
      const newCursor = cm.getCursor()
      cm.setCursor(newCursor)
      cm.focus()
      
    } catch (error) {
      console.warn('粘贴处理失败，使用默认行为:', error)
      return false
    }
  }, [])

  const insertText = useCallback((before: string, after: string) => {
    if (editMode === 'markdown') {
      let cm: CodeMirrorInstance | null = null
      
      const editor = getEditor()
      if (editor && editor.codemirror) {
        cm = editor.codemirror
      }
      
      if (!cm && mdeRef.current && mdeRef.current.simpleMde && mdeRef.current.simpleMde.codemirror) {
        cm = mdeRef.current.simpleMde.codemirror
      }
      
      if (!cm) {
        const cmElement = document.querySelector('.CodeMirror')
        if (cmElement && 'CodeMirror' in cmElement) {
          cm = (cmElement as { CodeMirror: CodeMirrorInstance }).CodeMirror
        }
      }
      
      if (cm) {
        cm.focus()
        
        const selection = cm.getSelection()
        const cursor = cm.getCursor()
        
        if (selection) {
          // 检查选中的文本是否已经被标记
          const isMarked = selection.startsWith(before) && selection.endsWith(after)
          if (isMarked) {
            // 如果已经被标记，移除标记
            const unmarkedText = selection.substring(before.length, selection.length - after.length)
            cm.replaceSelection(unmarkedText)
          } else {
            // 如果没有被标记，添加标记
            cm.replaceSelection(before + selection + after)
          }
        } else {
          cm.replaceRange(before + after, cursor)
          const newCursor = {
            line: cursor.line,
            ch: cursor.ch + before.length
          }
          cm.setCursor(newCursor)
        }
        
        cm.triggerOnKeyDown(new KeyboardEvent('keydown'))
        
        setTimeout(() => {
          cm.focus()
          cm.refresh()
        }, 10)
      } else {
        const textarea = document.querySelector('.CodeMirror textarea') as HTMLTextAreaElement
        if (textarea) {
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const selectedText = value.substring(start, end)
          
          // 检查选中的文本是否已经被标记
          const isMarked = selectedText.startsWith(before) && selectedText.endsWith(after)
          let newValue
          
          if (isMarked) {
            // 如果已经被标记，移除标记
            const unmarkedText = selectedText.substring(before.length, selectedText.length - after.length)
            newValue = value.substring(0, start) + unmarkedText + value.substring(end)
          } else {
            // 如果没有被标记，添加标记
            newValue = value.substring(0, start) + before + selectedText + after + value.substring(end)
          }
          
          onChange(newValue)
          
          setTimeout(() => {
            if (textarea) {
              const newStart = start + (isMarked ? -before.length : before.length)
              const newEnd = end + (isMarked ? -after.length : after.length)
              textarea.focus()
              textarea.setSelectionRange(newStart, newEnd)
            }
          }, 0)
        } else {
          const newValue = value + before + after
          onChange(newValue)
        }
      }
    } else {
      // 富文本模式下的处理
      if (tiptapEditor) {
        tiptapEditor.chain().focus()
        
        // 根据 before 和 after 确定要执行的操作
        if (before === '**' && after === '**') {
          // 加粗
          tiptapEditor.chain().focus().toggleMark('bold').run()
        } else if (before === '*' && after === '*') {
          // 斜体
          tiptapEditor.chain().focus().toggleMark('italic').run()
        } else if (before === '~~' && after === '~~') {
          // 删除线
          tiptapEditor.chain().focus().toggleMark('strike').run()
        } else if (before === '```' && after === '```') {
          // 代码块
          tiptapEditor.chain().focus().toggleCodeBlock().run()
        } else if (before === '> ' && after === '') {
          // 引用
          tiptapEditor.chain().focus().toggleBlockquote().run()
        } else if (before === '# ' && after === '') {
          // H1 标题
          tiptapEditor.chain().focus().toggleHeading({ level: 1 }).run()
        } else if (before === '## ' && after === '') {
          // H2 标题
          tiptapEditor.chain().focus().toggleHeading({ level: 2 }).run()
        } else if (before === '### ' && after === '') {
          // H3 标题
          tiptapEditor.chain().focus().toggleHeading({ level: 3 }).run()
        } else if (before === '- ' && after === '') {
          // 无序列表
          tiptapEditor.chain().focus().toggleBulletList().run()
        } else if (before === '1. ' && after === '') {
          // 有序列表
          tiptapEditor.chain().focus().toggleOrderedList().run()
        } else if (before === '---' && after === '') {
          // 水平线
          tiptapEditor.chain().focus().setHorizontalRule().run()
        } else if (before === '[' && after === '](url)') {
          // 链接
          tiptapEditor.chain().focus().setLink({ href: 'url' }).run()
        } else {
          // 其他情况，直接插入文本
          const { from, to } = tiptapEditor.state.selection
          const selection = tiptapEditor.state.doc.textBetween(from, to)
          if (selection) {
            tiptapEditor.chain().focus().insertContent(before + selection + after).run()
          } else {
            tiptapEditor.chain().focus().insertContent(before + after).run()
          }
        }
      }
    }
  }, [value, onChange, getEditor, editMode, tiptapEditor])

  // @ts-expect-error - Unused function, kept for potential future use
  const _togglePreview = useCallback(() => {
    const editor = getEditor()
    if (editor) {
      try {
        if (editor.isPreviewActive()) {
          editor.togglePreview()
          setIsPreview(false)
        } else {
          editor.togglePreview()
          setIsPreview(true)
        }
      } catch {
        setIsPreview(!isPreview)
      }
    } else {
      setIsPreview(!isPreview)
    }
  }, [isPreview, getEditor])

  // @ts-expect-error - Unused function, kept for potential future use
  const _switchToEdit = useCallback(() => {
    const editor = getEditor()
    if (editor) {
      try {
        if (editor.isPreviewActive()) {
          editor.togglePreview()
        }
        setIsPreview(false)
      } catch {
        setIsPreview(false)
      }
    } else {
      setIsPreview(false)
    }
  }, [getEditor])

  // @ts-expect-error - Unused function, kept for potential future use
  const _switchToPreview = useCallback(() => {
    const editor = getEditor()
    if (editor) {
      try {
        if (!editor.isPreviewActive()) {
          editor.togglePreview()
        }
        setIsPreview(true)
      } catch {
        setIsPreview(true)
      }
    } else {
      setIsPreview(true)
    }
  }, [getEditor])

  const options = useMemo(() => {
    const extraKeys = {
      'Ctrl-V': function(cm: CodeMirrorInstance) {
        handlePaste(cm)
      },
      'Cmd-V': function(cm: CodeMirrorInstance) {
        handlePaste(cm)
      }
    }
    
    return {
      placeholder,
      spellChecker: false,
      status: false,
      autofocus: true,
      lineWrapping: true,
      autoDownloadFontAwesome: false,
      renderingConfig: {
        singleLineBreaks: true,
        codeSyntaxHighlighting: true,
      },
      autosave: {
        enabled: false,
        uniqueId: 'notes-editor',
      },
      toolbar: false,
      cursorBlinkRate: 530,
      cursorHeight: 1,
      theme: 'default',
      lineNumbers: false,
      extraKeys,
      cursorScrollMargin: 8,
      inputStyle: 'contenteditable' as const,
      direction: 'ltr' as const,
      rtlMoveVisually: true,
      showCursorWhenSelecting: true,
      electricChars: true,
      smartIndent: true,
      indentUnit: 2,
      tabSize: 2,
    }
  }, [placeholder, handlePaste])

  useEffect(() => {
    const checkEditor = () => {
      if (mdeRef.current && mdeRef.current.simpleMde) {
        setEditorInstance(mdeRef.current.simpleMde)
        
        const cm = mdeRef.current.simpleMde.codemirror
        if (cm) {
          setTimeout(() => {
            const fixCursorPosition = () => {
              cm.refresh()
              
              const cursorElement = cm.getWrapperElement().querySelector('.CodeMirror-cursor') as HTMLElement | null
              if (cursorElement) {
                cursorElement.style.cssText = `
                  border-left: 2px solid #3b82f6 !important;
                  border-right: none !important;
                  width: 0 !important;
                  height: 1.2em !important;
                  background: transparent !important;
                  position: relative !important;
                  vertical-align: baseline !important;
                  display: inline-block !important;
                  line-height: 1.6 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  top: 0 !important;
                  bottom: auto !important;
                `
              }
            }
            
            fixCursorPosition()
            
            cm.focus()
            
            const handleCursorUpdate = () => {
              setTimeout(fixCursorPosition, 0)
            }
            
            cm.on('cursorActivity', handleCursorUpdate)
            cm.on('change', handleCursorUpdate)
            cm.on('focus', handleCursorUpdate)
            cm.on('blur', handleCursorUpdate)
            
            return () => {
              cm.off('cursorActivity', handleCursorUpdate)
              cm.off('change', handleCursorUpdate)
              cm.off('focus', handleCursorUpdate)
              cm.off('blur', handleCursorUpdate)
            }
          }, 100)
        }
      }
    }
    
    checkEditor()
    
    const timer = setInterval(checkEditor, 100)
    
    return () => {
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const editor = getEditor()
    if (editor && editor.codemirror) {
      const cm = editor.codemirror
      
      const handlePasteEvent = async (event: ClipboardEvent) => {
        event.preventDefault()
        
        try {
          const clipboardData = event.clipboardData?.getData('text/plain') || ''
          
          const processedText = clipboardData
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
          
          const cursor = cm.getCursor()
          const selection = cm.getSelection()
          
          if (selection) {
            cm.replaceSelection(processedText)
          } else {
            cm.replaceRange(processedText, cursor)
          }
          
          const newCursor = cm.getCursor()
          cm.setCursor(newCursor)
          cm.focus()
          
        } catch (error) {
          console.warn('粘贴处理失败:', error)
        }
      }
      
      cm.getWrapperElement().addEventListener('paste', handlePasteEvent)
      
      return () => {
        cm.getWrapperElement().removeEventListener('paste', handlePasteEvent)
      }
    }
  }, [editorInstance, getEditor])

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const editor = getEditor()
      if (editor && editor.codemirror) {
        editor.codemirror.focus()
        editor.codemirror.refresh()
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [getEditor])

  useEffect(() => {
    const applySettingsFromStorage = () => {
      try {
        const currentUsername = localStorage.getItem('username')
        const settingsKey = currentUsername ? `app-settings-${currentUsername}` : 'app-settings'
        const saved = localStorage.getItem(settingsKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          const fontSizeMap: Record<string, string> = { '小': '14px', '中': '16px', '大': '18px', '特大': '20px', '超大': '22px' }
          const resolvedFontSize = fontSizeMap[parsed.fontSize as keyof typeof fontSizeMap] || '14px'
          const resolvedLineHeight = '1.6'
          
          document.documentElement.style.setProperty('--global-font-size', resolvedFontSize)
          document.documentElement.style.setProperty('--global-line-height', resolvedLineHeight)
          
          document.documentElement.style.setProperty('--editor-font-size', resolvedFontSize)
          document.documentElement.style.setProperty('--editor-line-height', resolvedLineHeight)
          const bg = parsed.backgroundImageUrl?.trim()
          if (bg) {
            document.documentElement.style.setProperty('--app-bg-image', `url('${bg}')`)
          } else {
            document.documentElement.style.removeProperty('--app-bg-image')
          }
          const familyMap: Record<string, string> = {
            '默认': "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            '宋体': "'SimSun', 'Songti SC', 'Noto Serif SC', serif",
            '楷体': "'KaiTi', 'Kaiti SC', 'STKaiti', 'Noto Serif SC', serif",
            '黑体': "'Heiti SC', 'SimHei', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
            '微软雅黑': "'Microsoft YaHei', 'Noto Sans SC', sans-serif",
            '思源黑体': "'Noto Sans SC', 'Source Han Sans SC', sans-serif",
            '思源宋体': "'Noto Serif SC', 'Source Han Serif SC', serif",
            '苹方': "'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif",
            '仿宋': "'FangSong', 'FZSongYi-Z13', 'Songti SC', 'Noto Serif SC', serif",
            '隶书': "'LiSu', 'STLiti', 'KaiTi', 'Noto Serif SC', serif"
          }
          const resolvedFamily = familyMap[parsed.fontFamily as keyof typeof familyMap] || familyMap['默认']
          document.documentElement.style.setProperty('--editor-font-family', resolvedFamily)
        }
      } catch {}
    }

    applySettingsFromStorage()

    const handler = () => applySettingsFromStorage()
    window.addEventListener('settings-changed', handler as EventListener)
    return () => {
      window.removeEventListener('settings-changed', handler as EventListener)
    }
  }, [])

  useEffect(() => {
    const handleInsertTextEvent = (event: CustomEvent) => {
      const { before, after } = event.detail
      
      insertText(before, after)
    }

    window.addEventListener('insert-text', handleInsertTextEvent as EventListener)
    return () => {
      window.removeEventListener('insert-text', handleInsertTextEvent as EventListener)
    }
  }, [insertText])

  return (
    <div className="notes-editor-container" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', position: 'relative' }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setEditMode('markdown')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: editMode === 'markdown' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255,255,255,0.1)',
              color: editMode === 'markdown' ? '#ffffff' : '#1f2937',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            Markdown
          </button>
          <button
            onClick={() => setEditMode('rich')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: editMode === 'rich' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255,255,255,0.1)',
              color: editMode === 'rich' ? '#ffffff' : '#1f2937',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            富文本
          </button>
        </div>
      </div>

      <div style={{ minHeight: '550px' }}>
        {editMode === 'markdown' ? (
          <SimpleMDE
            ref={mdeRef as React.LegacyRef<HTMLDivElement>}
            value={value}
            onChange={handleChange}
            options={options}
            key="stable-editor"
          />
        ) : (
          <div style={{ 
            minHeight: '550px', 
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '0 0 8px 8px',
            background: 'rgba(255,255,255,0.95)',
            position: 'relative'
          }}>
            {tiptapEditor && (
              <EditorContent editor={tiptapEditor} />
            )}
            {/* 确保容器有焦点能力 */}
            <style>{`
              .ProseMirror {
                min-height: 550px;
                position: relative;
                border: none !important;
                outline: none !important;
                line-height: 1.6 !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }
              .ProseMirror p,
              .ProseMirror h1,
              .ProseMirror h2,
              .ProseMirror h3,
              .ProseMirror h4,
              .ProseMirror h5,
              .ProseMirror h6,
              .ProseMirror blockquote,
              .ProseMirror pre,
              .ProseMirror ul,
              .ProseMirror ol,
              .ProseMirror li {
                margin: 0 !important;
                padding: 0 !important;
              }
              .ProseMirror p {
                line-height: 1.6 !important;
              }
              .ProseMirror:empty:before {
                content: ' ';
                position: absolute;
                top: 0;
                left: 0;
                color: #999;
              }
              /* 移除所有可能的边框 */
              .ProseMirror-focused {
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
              }
            `}</style>
          </div>
        )}
      </div>

      <style>{`
        .notes-editor-container { 
          overflow-x: hidden !important; 
          overflow-y: visible !important;
        }
        
        .notes-editor-container {
          position: relative !important;
          transform: none !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
          z-index: auto !important;
        }
        .notes-editor-container .CodeMirror,
        .notes-editor-container .CodeMirror-scroll,
        .notes-editor-container .CodeMirror-wrap,
        .notes-editor-container .CodeMirror-wrap .CodeMirror-scroll { overflow-x: hidden !important; }
        .notes-editor-container .editor-statusbar { display: none !important; border: none !important; box-shadow: none !important; background: transparent !important; height: 0 !important; padding: 0 !important; }
        .notes-editor-container .CodeMirror { border: none !important; box-shadow: none !important; }
        .notes-editor-container .editor-toolbar { border-bottom: none !important; }
        .notes-editor-container .CodeMirror-hscrollbar,
        .notes-editor-container .CodeMirror-hscrollbar > div { display: none !important; height: 0 !important; }
        .notes-editor-container .CodeMirror-sizer { min-width: 0 !important; }
        .notes-editor-container .editor-preview,
        .notes-editor-container .editor-preview-side { overflow-x: hidden !important; }
        .notes-editor-container .CodeMirror pre { 
          white-space: pre-wrap !important; 
          word-wrap: break-word !important; 
          word-break: break-all !important;
          overflow-wrap: break-word !important;
        }
        .notes-editor-container .CodeMirror, .notes-editor-container .editor-toolbar, .notes-editor-container .editor-statusbar { background: transparent !important; }
        .notes-editor-container .CodeMirror-gutters { background: transparent !important; border: none !important; }
        
        .notes-editor-container .CodeMirror .CodeMirror-cursor {
          border-left: 2px solid #3b82f6 !important;
          border-right: none !important;
          width: 0 !important;
          height: 1.2em !important;
          background: transparent !important;
          animation: cursor-blink 1s infinite !important;
          position: relative !important;
          vertical-align: baseline !important;
          display: inline-block !important;
          line-height: 1.6 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .notes-editor-container .CodeMirror.CodeMirror-focused .CodeMirror-cursor {
          border-left-width: 3px !important;
          border-left-color: #2563eb !important;
        }
        
        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        
        .notes-editor-container .CodeMirror {
          color: #1f2937 !important;
          background: transparent !important;
          height: auto !important;
        }
        
        .notes-editor-container .CodeMirror-lines {
          padding: 16px !important;
        }
        .notes-editor-container .CodeMirror-scroll {
          max-height: none !important;
          overflow-y: auto !important;
        }
        
        .notes-editor-container .CodeMirror .CodeMirror-line {
          line-height: 1.6 !important;
          height: auto !important;
          min-height: 1.6em !important;
          font-size: var(--editor-font-size, 14px) !important;
          font-family: var(--editor-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace) !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
        }
        
        .notes-editor-container .CodeMirror .CodeMirror-line span {
          line-height: 1.6 !important;
          vertical-align: baseline !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
        }
        
        /* Tiptap 样式 */
        .prose {
          max-width: 100% !important;
          white-space: pre-wrap !important;
        }
        
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          margin-top: 1.5em !important;
          margin-bottom: 0.5em !important;
        }
        
        .prose p {
          margin-bottom: 1em !important;
        }
        
        .prose ul, .prose ol {
          margin-left: 1.5em !important;
          margin-bottom: 1em !important;
        }
      `}</style>


    </div>
  )
}

export default Editor
