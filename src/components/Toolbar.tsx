import React, { useState, useEffect } from 'react'
import { EditorToolbarProps } from '@/types'

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsertText }) => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    })

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getToolbarPosition = () => {
    const { width } = windowSize
    
    if (width < 768) {
      return {
        position: 'fixed' as const,
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '90vw'
      }
    } else {
      return {
        position: 'fixed' as const,
        left: '0px',
        top: '64px',
        height: 'calc(100vh - 64px)',
        maxHeight: 'calc(100vh - 64px)',
        width: '153px',
        marginLeft: '0px',
        marginRight: '0px'
      }
    }
  }

  const toolbarStyle = {
    ...getToolbarPosition(),
    background: 'rgba(255,255,255,0.90)',
    backdropFilter: 'blur(16px)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(200,200,200,0.30)',
    padding: '16px',
    marginLeft: '0px',
    marginRight: '0px',
    display: 'flex',
    flexDirection: windowSize.width < 768 ? 'row' as const : 'column' as const,
    alignItems: 'stretch',
    gap: '8px',
    zIndex: 1000,
    flexWrap: windowSize.width < 768 ? 'wrap' as const : 'nowrap' as const,
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  }

  const getButtonStyle = () => ({
    width: '100%',
    textAlign: 'left' as const,
    padding: windowSize.width < 768 ? '8px 12px' : '6px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontWeight: 'normal',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: 'none',
    outline: 'none'
  })

  useEffect(() => {
    const updateToolbarStyle = () => {
      const toolbar = document.getElementById('custom-toolbar')
      if (toolbar) {
        // 根据当前主题调整工具栏样式
        const isDark = document.documentElement.classList.contains('theme-dark')
        const isEyeCare = document.documentElement.classList.contains('theme-eye-care')
        
        if (isDark) {
          toolbar.style.background = 'rgba(30,30,30,0.90)'
          toolbar.style.borderColor = 'rgba(60,60,60,0.5)'
          toolbar.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)'
        } else if (isEyeCare) {
          toolbar.style.background = 'rgba(200,220,200,0.90)'
          toolbar.style.borderColor = 'rgba(180,200,180,0.5)'
          toolbar.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        } else {
          toolbar.style.background = 'rgba(255,255,255,0.90)'
          toolbar.style.borderColor = 'rgba(200,200,200,0.30)'
          toolbar.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }
      }
    }

    // 初始更新
    updateToolbarStyle()
    
    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateToolbarStyle()
        }
      })
    })
    
    observer.observe(document.documentElement, { attributes: true })
    
    return () => observer.disconnect()
  }, [])

  return (
    <div 
      id="custom-toolbar" 
      style={toolbarStyle}
      className="toolbar-fixed-width"
      data-width="153px"
    >
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <button 
        title="任务列表" 
        onClick={() => onInsertText('- [ ] ', '')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☐</span>
            任务列表
          </span>
        ) : (
          '☐'
        )}
      </button>
      
      <button 
        title="链接" 
        onClick={() => onInsertText('[', '](url)')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔗</span>
            链接
          </span>
        ) : (
          '🔗'
        )}
      </button>
      
      <button 
        title="图片" 
        onClick={() => onInsertText('![', '](url)')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</span>
            图片
          </span>
        ) : (
          '🖼️'
        )}
      </button>
      
      <button 
        title="粗体" 
        onClick={() => onInsertText('**', '**')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>B</span>
            粗体
          </span>
        ) : (
          'B'
        )}
      </button>
      
      <button 
        title="斜体" 
        onClick={() => onInsertText('*', '*')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>I</span>
            斜体
          </span>
        ) : (
          'I'
        )}
      </button>
      
      <button 
        title="代码块" 
        onClick={() => onInsertText('```\n', '\n```')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&lt;/&gt;</span>
            代码块
          </span>
        ) : (
          '&lt;/&gt;'
        )}
      </button>
      
      <button 
        title="标题" 
        onClick={() => onInsertText('# ', '')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>H1</span>
            标题
          </span>
        ) : (
          'H1'
        )}
      </button>
      
      <button 
        title="二级标题" 
        onClick={() => onInsertText('## ', '')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>H2</span>
            二级标题
          </span>
        ) : (
          'H2'
        )}
      </button>
      
      <button 
        title="三级标题" 
        onClick={() => onInsertText('### ', '')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>H3</span>
            三级标题
          </span>
        ) : (
          'H3'
        )}
      </button>
      
      <button 
        title="删除线" 
        onClick={() => onInsertText('~~', '~~')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
            删除线
          </span>
        ) : (
          'S'
        )}
      </button>
      
      <button 
        title="引用" 
        onClick={() => onInsertText('> ', '')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&gt;</span>
            引用
          </span>
        ) : (
          '&gt;'
        )}
      </button>
      
      <button 
        title="无序列表" 
        onClick={() => onInsertText('- ', '')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>•</span>
            无序列表
          </span>
        ) : (
          '•'
        )}
      </button>
      
      <button 
        title="有序列表" 
        onClick={() => onInsertText('1. ', '')} 
        style={getButtonStyle()} 
        onMouseEnter={(e) => { 
          e.currentTarget.style.background = 'var(--bg-secondary)'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = '500'; 
        }} 
        onMouseLeave={(e) => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-primary)'; 
          e.currentTarget.style.fontWeight = 'normal'; 
        }}
      >
        {windowSize.width >= 768 ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1.</span>
            有序列表
          </span>
        ) : (
          '1.'
        )}
      </button>
      </div>
      
    </div>
  )
}

export default EditorToolbar
