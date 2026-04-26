import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/Context'
import { loadAndSetPageTitle } from '@/lib/utils'
import { Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { AppSettings } from '@/types'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [displayTitle, setDisplayTitle] = useState('笔记系统')
  const { login, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const username = loadAndSetPageTitle()
    if (username) {
      setDisplayTitle(username)
    }
    
    const loadSettingsAsync = async () => {
      try {
        const saved = localStorage.getItem('app-settings')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.username && typeof parsed.username === 'string') {
            setDisplayTitle(parsed.username)
          }
          if (parsed.logoUrl && typeof parsed.logoUrl === 'string') {
            const url = parsed.logoUrl.trim()
            if (url) {
              const img = document.getElementById('login-logo') as HTMLImageElement | null
              if (img) img.src = url
              let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
              if (!link) {
                link = document.createElement('link')
                link.rel = 'icon'
                document.head.appendChild(link)
              }
              link.href = url
            }
          }
        }
      } catch {}
    }
    
    setTimeout(loadSettingsAsync, 0)
    
    const settingsHandler = (event: CustomEvent<AppSettings>) => {
      const settings = event.detail

      if (settings && settings.username && typeof settings.username === 'string') {
        setDisplayTitle(settings.username)

        document.title = settings.username
        const descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement
        const appMeta = document.querySelector('meta[name="application-name"]') as HTMLMetaElement
        if (descMeta) descMeta.content = `${settings.username} - 个人笔记管理系统`
        if (appMeta) appMeta.content = settings.username
      }

      if (settings && typeof settings.logoUrl === 'string') {
        const url = settings.logoUrl.trim()
        const img = document.getElementById('login-logo') as HTMLImageElement | null
        if (img && url) img.src = url
        if (url) {
          let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.head.appendChild(link)
          }
          link.href = url
        }
      }
    }
    window.addEventListener('settings-changed', settingsHandler as EventListener)
    
    
    return () => {
      window.removeEventListener('settings-changed', settingsHandler as EventListener)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password.trim()) {
      setError('请输入密码')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      let success
      if (isRegister) {
        success = await register(username, password)
      } else {
        success = await login(username, password)
      }
      
      if (success) {
        navigate('/notes')
      } else {
        setError(isRegister ? '注册失败，请重试' : '用户名或密码错误')
      }
    } catch {
      setError(isRegister ? '注册失败，请重试' : '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      backgroundImage: `
        repeating-linear-gradient(
          45deg,
          rgba(200, 190, 170, 0.05) 0px,
          rgba(200, 190, 170, 0.05) 2px,
          transparent 2px,
          transparent 8px
        ),
        repeating-linear-gradient(
          135deg,
          rgba(180, 160, 130, 0.03) 0px,
          rgba(180, 160, 130, 0.03) 1px,
          transparent 1px,
          transparent 6px
        )
      `,
      backgroundColor: '#fbfaf8',
      backgroundAttachment: 'fixed'
    }}>
      <div className="max-w-md w-full space-y-8">
        <div className="login-card bg-gray-100/90 backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200/70" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
          <div className="text-center">
            <h2 className="font-bold text-gray-800" style={{ fontSize: 'calc(var(--global-font-size, 16px) * 1.5)' }}>{displayTitle}</h2>
          </div>

          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium ${!isRegister ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} rounded-l-lg border border-gray-300 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-gray-500`}
                onClick={() => setIsRegister(false)}
              >
                <LogIn className="w-4 h-4 mr-2" />
                登录
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium ${isRegister ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} rounded-r-lg border border-gray-300 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-gray-500`}
                onClick={() => setIsRegister(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                注册
              </button>
            </div>
          </div>

          <form 
            className="space-y-6" 
            onSubmit={handleSubmit} 
            data-form={isRegister ? "register" : "login"}
            method="post"
            action={isRegister ? "/register" : "/login"}
          >
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-center">{error}</div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold border-none rounded-lg flex items-center justify-center py-3 focus:outline-none focus:ring-2 focus:ring-gray-500"
                data-action={isRegister ? "register" : "login"}
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                )}
                {isRegister ? '注册' : '登录'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login