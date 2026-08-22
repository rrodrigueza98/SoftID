import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import { AppShell } from './components/layout/AppShell';
import { PageSpinner } from './components/ui/Spinner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComprobantesPage from './pages/ComprobantesPage';
import PanelVentasPage from './pages/PanelVentasPage';
import PanelComprasPage from './pages/PanelComprasPage';
import PanelInventarioPage from './pages/PanelInventarioPage';
import PanelRentabilidadPage from './pages/PanelRentabilidadPage';
import PosPage from './pages/PosPage';
import EmitirComprobantePage from './pages/EmitirComprobantePage';
import TercerosPage from './pages/TercerosPage';
import ProductosPage from './pages/ProductosPage';
import StockPage from './pages/StockPage';
import CuentasCorrientesPage from './pages/CuentasCorrientesPage';
import ComprasPage from './pages/ComprasPage';
import ContabilidadPage from './pages/ContabilidadPage';
import BancosPage from './pages/BancosPage';
import UsuariosPage from './pages/UsuariosPage';
import EstablecimientosPage from './pages/EstablecimientosPage';
import DatosEmpresaPage from './pages/DatosEmpresaPage';
import ConfiguracionSifenPage from './pages/ConfiguracionSifenPage';
import NuevaEmpresaPage from './pages/NuevaEmpresaPage';
import ComprobantePrintPage from './pages/ComprobantePrintPage';
import ReciboPrintPage from './pages/ReciboPrintPage';
import F120Page from './pages/F120Page';
import F120PrintPage from './pages/F120PrintPage';

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
      <Route path="/imprimir/f120/:id" element={<F120PrintPage />} />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/facturacion" element={<ComprobantesPage />} />
        <Route path="/panel-ventas" element={<PanelVentasPage />} />
        <Route path="/panel-rentabilidad" element={<PanelRentabilidadPage />} />
        <Route path="/facturacion/emitir" element={<EmitirComprobantePage />} />
        <Route path="/facturacion/corregir/:id" element={<EmitirComprobantePage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/clientes" element={<TercerosPage tipo="CLIENTE" />} />
        <Route path="/proveedores" element={<TercerosPage tipo="PROVEEDOR" />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/panel-inventario" element={<PanelInventarioPage />} />
        <Route path="/cuentas-corrientes" element={<CuentasCorrientesPage tipo="CLIENTE" />} />
        <Route path="/compras" element={<ComprasPage />} />
        <Route path="/compras/cuentas-corrientes" element={<CuentasCorrientesPage tipo="PROVEEDOR" />} />
        <Route path="/panel-compras" element={<PanelComprasPage />} />
        <Route path="/contabilidad" element={<ContabilidadPage />} />
        <Route path="/formulario-120" element={<F120Page />} />
        <Route path="/bancos" element={<BancosPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/empresa" element={<DatosEmpresaPage />} />
        <Route path="/establecimientos" element={<EstablecimientosPage />} />
        <Route path="/sifen" element={<ConfiguracionSifenPage />} />
        <Route path="/empresas/nueva" element={<NuevaEmpresaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
