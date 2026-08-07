import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import { AppShell } from './components/layout/AppShell';
import { PageSpinner } from './components/ui/Spinner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComprobantesPage from './pages/ComprobantesPage';
import PosPage from './pages/PosPage';
import EmitirComprobantePage from './pages/EmitirComprobantePage';
import TercerosPage from './pages/TercerosPage';
import ProductosPage from './pages/ProductosPage';
import StockPage from './pages/StockPage';
import CuentasCorrientesPage from './pages/CuentasCorrientesPage';
import ContabilidadPage from './pages/ContabilidadPage';
import ComprobantePrintPage from './pages/ComprobantePrintPage';
import ReciboPrintPage from './pages/ReciboPrintPage';

function ProtectedShell() {
  const { usuario, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (!usuario) return <Navigate to="/login" replace />;

  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Fuera del AppShell a proposito: es una hoja para imprimir, no necesita sidebar. */}
      <Route path="/imprimir/comprobantes/:id" element={<ComprobantePrintPage />} />
      <Route path="/imprimir/recibos/:id" element={<ReciboPrintPage />} />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/facturacion" element={<ComprobantesPage />} />
        <Route path="/facturacion/emitir" element={<EmitirComprobantePage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/clientes" element={<TercerosPage tipo="CLIENTE" />} />
        <Route path="/proveedores" element={<TercerosPage tipo="PROVEEDOR" />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/cuentas-corrientes" element={<CuentasCorrientesPage />} />
        <Route path="/contabilidad" element={<ContabilidadPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
