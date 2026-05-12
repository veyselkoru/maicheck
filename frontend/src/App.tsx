// src/App.tsx v3.1
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AuditsPage from './pages/AuditsPage';
import AuditChecklistPage from './pages/AuditChecklistPage';
import AuditSummaryPage from './pages/AuditSummaryPage';
import SubcontractorsPage from './pages/SubcontractorsPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateEditorPage from './pages/TemplateEditorPage';
import DocumentTypesPage from './pages/DocumentTypesPage';
import FindingsPage from './pages/FindingsPage';
import ActionsPage from './pages/ActionsPage';
import EvidencePage from './pages/EvidencePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ImpactPage from './pages/ImpactPage';
import CommunicationPage from './pages/CommunicationPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"              element={<DashboardPage />} />
        <Route path="audits"                 element={<AuditsPage />} />
        <Route path="audits/:id/checklist"   element={<AuditChecklistPage />} />
        <Route path="audits/:id/summary"     element={<AuditSummaryPage />} />
        <Route path="subcontractors"         element={<SubcontractorsPage />} />
        <Route path="templates"              element={<TemplatesPage />} />
        <Route path="templates/:id"          element={<TemplateEditorPage />} />
        <Route path="document-types"         element={<DocumentTypesPage />} />
        <Route path="findings"               element={<FindingsPage />} />
        <Route path="actions"                element={<ActionsPage />} />
        <Route path="evidence"               element={<EvidencePage />} />
        <Route path="reports"                element={<ReportsPage />} />
        <Route path="impact"                 element={<ImpactPage />} />
        <Route path="communication"          element={<CommunicationPage />} />
        <Route path="settings"               element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
