import React from 'react'
import { Sun, Moon, Eye } from 'lucide-react'
import { useTheme, ThemeMode } from '@/contexts/ThemeContext'

interface ThemeSelectorProps {
  className?: string
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme()

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode; color: string }[] = [
    { 
      value: 'light', 
      label: '日间模式', 
      icon: <Sun className="h-4 w-4" />,
      color: 'bg-amber-500 hover:bg-amber-600'
    },
    { 
      value: 'dark', 
      label: '夜间模式', 
      icon: <Moon className="h-4 w-4" />,
      color: 'bg-slate-700 hover:bg-slate-600'
    },
    { 
      value: 'eye-care', 
      label: '护眼模式', 
      icon: <Eye className="h-4 w-4" />,
      color: 'bg-green-600 hover:bg-green-700'
    }
  ]

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">主题模式</label>
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${theme === t.value 
                ? `${t.color} text-white shadow-md ring-2 ring-offset-2 ring-gray-300` 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {theme === 'light' && '明亮的白天模式，适合在光线充足的环境使用'}
        {theme === 'dark' && '柔和的暗色模式，减少眼睛疲劳，适合夜间使用'}
        {theme === 'eye-care' && '护眼米黄色调，降低蓝光刺激，长时间阅读更舒适'}
      </p>
    </div>
  )
}

export default ThemeSelector