import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificacoesProvider } from "@/contexts/NotificacoesContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tutores from "./pages/Tutores";
import Pets from "./pages/Pets";
import Agenda from "./pages/Agenda";
import MinhaAgenda from "./pages/MinhaAgenda";
import Prontuario from "./pages/Prontuario";
import Prontuarios from "./pages/Prontuarios";
import ProntuarioDetalhe from "./pages/ProntuarioDetalhe";
import PetHistorico from "./pages/PetHistorico";
import Financeiro from "./pages/Financeiro";
import Caixa from "./pages/Caixa";
import Estoque from "./pages/Estoque";
import Relatorios from "./pages/Relatorios";
import Servicos from "./pages/Servicos";
import Configuracoes from "./pages/Configuracoes";
import Notificacoes from "./pages/Notificacoes";
import PlaceholderPage from "@/components/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <NotificacoesProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Admin Only */}
            <Route path="/" element={
              <RoleRoute allowedRoles={['admin']}>
                <AppLayout><Dashboard /></AppLayout>
              </RoleRoute>
            } />

            {/* Veterinario Only */}
            <Route path="/minha-agenda" element={
              <RoleRoute allowedRoles={['veterinario']}>
                <AppLayout><MinhaAgenda /></AppLayout>
              </RoleRoute>
            } />

            {/* Admin and Recepcionista */}
            <Route path="/tutores" element={
              <RoleRoute allowedRoles={['admin', 'recepcionista']}>
                <AppLayout><Tutores /></AppLayout>
              </RoleRoute>
            } />
            <Route path="/agenda" element={
              <RoleRoute allowedRoles={['admin', 'recepcionista']}>
                <AppLayout><Agenda /></AppLayout>
              </RoleRoute>
            } />

            {/* Everyone */}
            <Route path="/pets" element={
              <ProtectedRoute>
                <AppLayout><Pets /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/pets/:id" element={
              <ProtectedRoute>
                <AppLayout><PetHistorico /></AppLayout>
              </ProtectedRoute>
            } />

            {/* Admin and Veterinario */}
            <Route path="/prontuario/:consultaId" element={
              <RoleRoute allowedRoles={['admin', 'veterinario']}>
                <AppLayout><Prontuario /></AppLayout>
              </RoleRoute>
            } />
            <Route path="/prontuarios" element={
              <ProtectedRoute>
                <AppLayout><Prontuarios /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/prontuarios/:id" element={
              <ProtectedRoute>
                <AppLayout><ProntuarioDetalhe /></AppLayout>
              </ProtectedRoute>
            } />

            {/* Other Placeholders */}
            <Route path="/financeiro" element={
              <RoleRoute allowedRoles={['admin', 'recepcionista']}>
                <AppLayout><Financeiro /></AppLayout>
              </RoleRoute>
            } />
            <Route path="/caixa" element={
              <RoleRoute allowedRoles={['admin', 'recepcionista']}>
                <AppLayout><Caixa /></AppLayout>
              </RoleRoute>
            } />
            <Route path="/estoque" element={
              <RoleRoute allowedRoles={['admin', 'recepcionista']}>
                <AppLayout><Estoque /></AppLayout>
              </RoleRoute>
            } />
            <Route path="/relatorios" element={
              <RoleRoute allowedRoles={['admin']}>
                <AppLayout><Relatorios /></AppLayout>
              </RoleRoute>
            } />
            <Route path="/servicos" element={
              <RoleRoute allowedRoles={['admin']}>
                <AppLayout><Servicos /></AppLayout>
              </RoleRoute>
            } />
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <AppLayout><Configuracoes /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/notificacoes" element={
              <ProtectedRoute>
                <AppLayout><Notificacoes /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </NotificacoesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
