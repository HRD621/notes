import React, { createContext, useContext, useState, ReactNode } from 'react'
import { api } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  password: string | null
  admin: boolean
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [password, setPassword] = useState<string | null>(localStorage.getItem('password'))
  const [admin, setAdmin] = useState<boolean>(localStorage.getItem('admin') === 'true' || true)

  const [loading] = useState(false)


  const login = async (username: string, passwordInput: string): Promise<boolean> => {
    try {
      const response = await api.post('/api/login', { username, password: passwordInput })
      
      if (response.data.success) {
        setPassword(passwordInput)
        setAdmin(response.data.admin || false)
        localStorage.setItem('password', passwordInput)
        localStorage.setItem('username', username)
        localStorage.setItem('admin', (response.data.admin || false).toString())
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const register = async (username: string, passwordInput: string): Promise<boolean> => {
    try {
      const response = await api.post('/api/register', { username, password: passwordInput })
      
      if (response.data.success) {
        setPassword(passwordInput)
        setAdmin(false) // 新注册用户默认为非管理员
        localStorage.setItem('password', passwordInput)
        localStorage.setItem('username', username)
        localStorage.setItem('admin', 'false')
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const logout = () => {
    setPassword(null)
    setAdmin(false)
    localStorage.removeItem('password')
    localStorage.removeItem('username')
    localStorage.removeItem('admin')
  }

  const value: AuthContextType = {
    isAuthenticated: !!password,
    password,
    admin,
    login,
    register,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}