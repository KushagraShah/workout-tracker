import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { useAuth } from './contexts/useAuth'
import { AuthPage } from './pages/AuthPage'
import { ExerciseDetailPage } from './pages/ExerciseDetailPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { HomePage } from './pages/HomePage'
import { MachinesPage } from './pages/MachinesPage'
import { MusclesPage } from './pages/MusclesPage'
import { RoutineDetailPage } from './pages/RoutineDetailPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { SessionPage } from './pages/SessionPage'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/routines" element={<RoutinesPage />} />
        <Route path="/routines/:id" element={<RoutineDetailPage />} />
        <Route path="/sessions/:id" element={<SessionPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="/machines" element={<MachinesPage />} />
        <Route path="/muscles" element={<MusclesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
