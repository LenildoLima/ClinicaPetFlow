import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Financeiro from "./pages/Financeiro";
import Caixa from "./pages/Caixa";
import PlaceholderPage from "@/components/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
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
            <Route path="/configuracoes" element={
              <RoleRoute allowedRoles={['admin']}>
                <AppLayout><PlaceholderPage title="Configurações" /></AppLayout>
              </RoleRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
