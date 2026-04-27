import axios, { AxiosResponse, AxiosError } from 'axios'
import type { 
  ApiResponse, 
  Note, 
  NoteCreateRequest, 
  NoteUpdateRequest, 
  LoginRequest, 
  LoginResponse, 
  ChangePasswordRequest, 
  PasswordStatusResponse,
  ImportRequest,
  CloudBackup
} from '@/types'

interface ImportMetaEnv {
  VITE_API_BASE?: string
}

export const api = axios.create({
  baseURL: (import.meta as { env?: ImportMetaEnv }).env?.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3000' : ''),
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    // 登录和注册请求不添加Authorization头
    if (config.url?.includes('/api/login') || config.url?.includes('/api/register')) {
      return config
    }
    
    const password = localStorage.getItem('password')
    const username = localStorage.getItem('username')
    if (password) {
      config.headers.Authorization = `Bearer ${password}`
    }
    if (username) {
      config.headers['x-username'] = username
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const contentType = response.headers?.['content-type'] || ''
    const isJson = contentType.includes('application/json')
    const data = response.data
    const looksLikeHtml = typeof data === 'string' && data.trim().toLowerCase().startsWith('<!doctype html')
    if (!isJson && looksLikeHtml) {
      const error = new Error('服务返回了 HTML，而不是 JSON。请检查 API 代理或部署路径。') as AxiosError
      error.response = response
      throw error
    }
    return response
  },
  (error: AxiosError) => {
    // 只有当响应状态码确实是 401 时才重定向
    if (error.response?.status === 401) {
      // 检查是否是登录或注册请求，如果是则不重定向
      const originalRequest = error.config
      if (!originalRequest?.url?.includes('/api/login') && !originalRequest?.url?.includes('/api/register')) {
        localStorage.removeItem('password')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const notesApi = {
  getNotes: (): Promise<AxiosResponse<Note[]>> => api.get('/api/notes'),
  
  getNotesByUser: (userId: number): Promise<AxiosResponse<Note[]>> => api.get(`/api/notes?userId=${userId}`),
  
  getNote: (id: string): Promise<AxiosResponse<Note>> => api.get(`/api/notes/${id}`),
  
  createNote: (note: NoteCreateRequest): Promise<AxiosResponse<ApiResponse<{ id: string }>>> => 
    api.post('/api/notes', note),
  
  updateNote: (id: string, note: NoteUpdateRequest): Promise<AxiosResponse<ApiResponse>> => 
    api.put(`/api/notes/${id}`, note),
  
  deleteNote: (id: string): Promise<AxiosResponse<ApiResponse>> => 
    api.delete(`/api/notes/${id}`),
  
  importNotes: (request: ImportRequest): Promise<AxiosResponse<ApiResponse>> => 
    api.post('/api/import', request),

  updateNotes: (content: string): Promise<AxiosResponse<ApiResponse>> => 
    api.post('/api/notes', { content }),
  
  getUsers: (): Promise<AxiosResponse<any[]>> => api.get('/api/admin/users'),
}

export const authApi = {
  login: (request: LoginRequest): Promise<AxiosResponse<LoginResponse>> => 
    api.post('/api/login', request),
  
  changePassword: (request: ChangePasswordRequest): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/api/password', request),
  
  getPasswordStatus: (): Promise<AxiosResponse<PasswordStatusResponse>> => 
    api.get('/api/password/status'),
}

export const cloudApi = {
  uploadToCloud: (): Promise<AxiosResponse<ApiResponse>> => 
    api.post('/api/backup'),
  
  downloadFromCloud: (): Promise<AxiosResponse<CloudBackup>> => 
    api.get('/api/backup'),
}

export const gistApi = {
  uploadToGist: (): Promise<AxiosResponse<ApiResponse>> => 
    api.post('/api/gist'),
  
  downloadFromGist: (): Promise<AxiosResponse<CloudBackup>> => 
    api.get('/api/gist'),
}

export const r2Api = {
  uploadToR2: (): Promise<AxiosResponse<ApiResponse>> => 
    api.post('/api/r2'),
  
  downloadFromR2: (): Promise<AxiosResponse<CloudBackup>> => 
    api.get('/api/r2'),
}

export interface LogEntry {
  id: string
  level: string
  message: string
  meta?: string
  created_at: string
}

export interface LogsResponse {
  success: boolean
  logs?: LogEntry[]
}

export const logsApi = {
  getLogs: (): Promise<AxiosResponse<LogsResponse>> => api.get('/api/logs'),
  clearLogs: (): Promise<AxiosResponse<ApiResponse>> => api.delete('/api/logs'),
}

export type OrderData = string[] | { [key: string]: unknown }

export const orderApi = {
  getOrder: (key: string): Promise<AxiosResponse<{ success: boolean; data: OrderData | null }>> => 
    api.get(`/api/order/${key}`),
  
  saveOrder: (key: string, data: OrderData): Promise<AxiosResponse<ApiResponse>> => 
    api.post(`/api/order/${key}`, data),
}