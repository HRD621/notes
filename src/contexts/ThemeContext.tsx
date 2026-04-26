import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'eye-care'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode')
    return (saved as ThemeMode) || 'light'
  })

  useEffect(() => {
    localStorage.setItem('theme-mode', theme)
    applyTheme(theme)
  }, [theme])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  
  root.classList.remove('theme-light', 'theme-dark', 'theme-eye-care')
  root.classList.add(`theme-${theme}`)
  
  if (theme === 'dark') {
    root.style.setProperty('--bg-primary', '#1a1a1a')
    root.style.setProperty('--bg-secondary', '#242424')
    root.style.setProperty('--bg-card', '#2a2a2a')
    root.style.setProperty('--bg-header', '#222222')
    root.style.setProperty('--text-primary', '#d0d0d0')
    root.style.setProperty('--text-secondary', '#909090')
    root.style.setProperty('--border-color', '#3a3a3a')
    root.style.setProperty('--text-muted', '#707070')
  } else if (theme === 'eye-care') {
    root.style.setProperty('--bg-primary', '#c7edcc')
    root.style.setProperty('--bg-secondary', '#d5e8d4')
    root.style.setProperty('--bg-card', '#e2e8d5')
    root.style.setProperty('--bg-header', '#d8e5d6')
    root.style.setProperty('--text-primary', '#333333')
    root.style.setProperty('--text-secondary', '#555555')
    root.style.setProperty('--border-color', '#b8d4be')
    root.style.setProperty('--text-muted', '#666666')
  } else {
    root.style.setProperty('--bg-primary', '#f5f5f5')
    root.style.setProperty('--bg-secondary', '#ffffff')
    root.style.setProperty('--bg-card', '#ffffff')
    root.style.setProperty('--bg-header', '#ffffff')
    root.style.setProperty('--text-primary', '#333333')
    root.style.setProperty('--text-secondary', '#666666')
    root.style.setProperty('--border-color', '#e0e0e0')
    root.style.setProperty('--text-muted', '#999999')
  }
}