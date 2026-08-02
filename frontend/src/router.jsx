import { lazy, Suspense } from 'react'
import ProtectedRoute from './components/ui/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

const Login       = lazy(() => import('./pages/Login'))
const DynamicPage = lazy(() => import('./pages/DynamicPage'))
const AddWidget   = lazy(() => import('./pages/AddWidget'))
const AdminPanel  = lazy(() => import('./pages/AdminPanel'))
const ReportsPage    = lazy(() => import('./pages/ReportsPage'))
const OrdersPage     = lazy(() => import('./pages/OrdersPage'))
const LiveReportPage    = lazy(() => import('./pages/LiveReportPage'))
const ComparisonPage    = lazy(() => import('./pages/ComparisonPage'))
const AmbarAkisPage     = lazy(() => import('./pages/AmbarAkisPage'))
const DifferenceReportPage = lazy(() => import('./pages/DifferenceReportPage'))
const SiparisTakibiPage = lazy(() => import('./pages/SiparisTakibiPage'))
const SupportPage       = lazy(() => import('./pages/SupportPage'))
const CiroKarsilastirmaPage = lazy(() => import('./pages/CiroKarsilastirmaPage'))
const AlarmsPage            = lazy(() => import('./pages/AlarmsPage'))
const CostInventoryPage     = lazy(() => import('./pages/cost/CostInventoryPage'))
const CostProductsPage      = lazy(() => import('./pages/cost/CostProductsPage'))
const CostDiffPage          = lazy(() => import('./pages/cost/CostDiffPage'))
const CostReportPage        = lazy(() => import('./pages/cost/CostReportPage'))

const Fallback = () => <div style={{padding:'2rem'}}>Yükleniyor...</div>

const routes = [
  { path: '/login', element: <Suspense fallback={<Fallback/>}><Login /></Suspense> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<Fallback/>}><LiveReportPage /></Suspense> },
      { path: 'p/*', element: <Suspense fallback={<Fallback/>}><DynamicPage /></Suspense> },
      { path: 'reports', element: <Suspense fallback={<Fallback/>}><ReportsPage /></Suspense> },
      { path: 'siparisler', element: <Suspense fallback={<Fallback/>}><OrdersPage /></Suspense> },
      { path: 'siparisler/takip', element: <Suspense fallback={<Fallback/>}><SiparisTakibiPage /></Suspense> },
      { path: 'canli-rapor', element: <Suspense fallback={<Fallback/>}><LiveReportPage /></Suspense> },
      { path: 'ciro-karsilastirma', element: <Suspense fallback={<Fallback/>}><CiroKarsilastirmaPage /></Suspense> },
      { path: 'gelistirme/donem-karsilastirma', element: <Suspense fallback={<Fallback/>}><ComparisonPage /></Suspense> },
      { path: 'gelistirme/ambar-akis', element: <Suspense fallback={<Fallback/>}><AmbarAkisPage /></Suspense> },
      { path: 'gelistirme/fark-analizi', element: <Suspense fallback={<Fallback/>}><DifferenceReportPage /></Suspense> },
      { path: 'destek', element: <Suspense fallback={<Fallback/>}><SupportPage /></Suspense> },
      { path: 'alarmlar', element: <Suspense fallback={<Fallback/>}><AlarmsPage /></Suspense> },
      { path: 'cost/envanter', element: <Suspense fallback={<Fallback/>}><CostInventoryPage /></Suspense> },
      { path: 'cost/urunler', element: <Suspense fallback={<Fallback/>}><CostProductsPage /></Suspense> },
      { path: 'cost/fark', element: <Suspense fallback={<Fallback/>}><CostDiffPage /></Suspense> },
      { path: 'cost/rapor', element: <Suspense fallback={<Fallback/>}><CostReportPage /></Suspense> },
      {
        path: 'dashboard/ekle',
        element: (
          <ProtectedRoute roles={['admin','user']}>
            <Suspense fallback={<Fallback/>}><AddWidget /></Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['admin']}>
            <Suspense fallback={<Fallback/>}><AdminPanel /></Suspense>
          </ProtectedRoute>
        )
      },
    ]
  }
]

export default routes
