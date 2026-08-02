import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#94a3b8' }}>
      Yükleniyor...
    </div>
  )

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
