import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, Filter, Users } from 'lucide-react'
import Button from '@/components/ui/Button'
import NoteCard from '@/components/Card'
import AdvancedSearch from '@/components/Advanced'
import BackToTop from '@/components/BackTop'
import { AlertModal, ConfirmModal } from '@/components/Modal'
import { useModal } from '@/hooks/Modal'
import { notesApi } from '@/lib/api'
import type { Note } from '@/types'

const UserNotes: React.FC = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const modal = useModal()
  
  const [notes, setNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    tag: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    if (userId) {
      loadUserNotes()
    }
  }, [userId])

  const loadUserNotes = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const response = await notesApi.getNotesByUser(parseInt(userId))
      if (Array.isArray(response.data)) {
        setNotes(response.data)
        setFilteredNotes(response.data)
      }
    } catch (error) {
      console.error('加载用户笔记失败:', error)
      modal.alert('错误', '加载用户笔记失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterNotes(term, advancedFilters)
  }

  const handleAdvancedSearch = (filters: typeof advancedFilters) => {
    setAdvancedFilters(filters)
    filterNotes(searchTerm, filters)
  }

  const filterNotes = (term: string, filters: typeof advancedFilters) => {
    let filtered = [...notes]

    if (term) {
      const lowerTerm = term.toLowerCase()
      filtered = filtered.filter(note => 
        (note.title || '').toLowerCase().includes(lowerTerm) ||
        (note.content || '').toLowerCase().includes(lowerTerm)
      )
    }

    if (filters.tag) {
      filtered = filtered.filter(note => 
        Array.isArray(note.tags) ? note.tags.includes(filters.tag) : 
        (note.tags || '').includes(filters.tag)
      )
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate)
      filtered = filtered.filter(note => new Date(note.createdAt) >= startDate)
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(note => new Date(note.createdAt) <= endDate)
    }

    setFilteredNotes(filtered)
  }

  const handleBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleBack} variant="secondary" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              用户笔记
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="搜索笔记..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <Button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              高级搜索
            </Button>
          </div>
        </header>

        {showAdvancedSearch && (
          <AdvancedSearch
            onSearch={handleAdvancedSearch}
            onClose={() => setShowAdvancedSearch(false)}
          />
        )}

        <main className="mb-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-5/6 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                没有找到笔记
              </h3>
              <p className="text-gray-500 mb-4">
                该用户还没有创建任何笔记
              </p>
            </div>
          )}
        </main>

        <BackToTop />
      </div>

      <AlertModal
        isOpen={modal.alertState.isOpen}
        onClose={modal.closeAlert}
        title={modal.alertState.title}
        message={modal.alertState.message}
        type={modal.alertState.type}
        confirmText={modal.alertState.confirmText}
        onConfirm={modal.alertState.onConfirm}
      />

      <ConfirmModal
        isOpen={modal.confirmState.isOpen}
        onClose={modal.closeConfirm}
        title={modal.confirmState.title}
        message={modal.confirmState.message}
        confirmText={modal.confirmState.confirmText}
        cancelText={modal.confirmState.cancelText}
        onConfirm={modal.confirmState.onConfirm}
        onCancel={modal.confirmState.onCancel}
        type={modal.confirmState.type}
      />
    </div>
  )
}

export default UserNotes