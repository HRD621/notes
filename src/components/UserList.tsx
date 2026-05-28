import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/Modal'
import Button from '@/components/ui/Button'
import { notesApi } from '@/lib/api'
import { useAuth } from '@/contexts/Context'

interface User {
  id: number
  username: string
  admin: boolean
  createdAt: string
}

interface UserListModalProps {
  isOpen: boolean
  onClose: () => void
  onUserSelect: (userId: number) => void
}

const UserListModal: React.FC<UserListModalProps> = ({ isOpen, onClose, onUserSelect }) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { admin } = useAuth()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await notesApi.getUsers()
      if (Array.isArray(response.data)) {
        setUsers(response.data)
      }
    } catch (err) {
      console.error('获取用户列表失败:', err)
      setError('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setDeleting(true)
      await notesApi.deleteUser(userToDelete.id)
      setDeleteModalOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (err) {
      console.error('删除用户失败:', err)
      setError('删除用户失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="用户列表">
      <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-600">{error}</div>
          </div>
        )}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500">暂无用户</div>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">序号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">用户名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">角色</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%]">注册时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-50 bg-transparent">
                    <td className="px-4 py-3 break-words text-sm text-gray-900">{users.length - index}</td>
                    <td className="px-4 py-3 break-words text-sm text-gray-900">{user.username}</td>
                    <td className="px-4 py-3 break-words">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.admin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.admin ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="px-4 py-3 break-words text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 break-words text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onUserSelect(user.id)}
                        >
                          查看笔记
                        </Button>
                        {admin && !user.admin && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteClick(user)}
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-transparent p-4">
          <Button onClick={onClose}>
            关闭
          </Button>
          {!loading && (
            <Button onClick={loadUsers}>
              刷新
            </Button>
          )}
        </div>
      </div>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="确认删除">
        <div className="p-4">
          <p className="text-gray-700 mb-4">
            确定要删除用户 <strong>{userToDelete?.username}</strong> 吗？
          </p>
          <p className="text-red-600 text-sm mb-6">
            警告：此操作将同时删除该用户的所有笔记，且无法恢复！
          </p>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}

export default UserListModal