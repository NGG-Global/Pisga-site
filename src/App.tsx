import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, useMe } from './auth/AuthProvider';
import { Shell } from './components/Shell';
import { LoadError, Loading } from './components/ui';
import { isParticipant, isStaff, type Role } from './data/types';
import { Advisor, AdvisorConversationProvider } from './screens/Advisor';
import { Home } from './screens/Home';
import { Journal } from './screens/Journal';
import { JournalExport } from './screens/JournalExport';
import { LeadershipMap } from './screens/LeadershipMap';
import { ForgotPassword, Login, NoAccess, ResetPassword } from './screens/Login';
import { Mapping } from './screens/Mapping';
import { NotFound } from './screens/NotFound';
import { Project } from './screens/Project';
import { SessionDetail } from './screens/SessionDetail';
import { Sessions } from './screens/Sessions';
import { Station } from './screens/Station';

// Content management is loaded on demand, so participants never download it.
const admin = () => import('./screens/admin');
const AdminLayout = lazy(() => admin().then((m) => ({ default: m.AdminLayout })));
const AdminSessions = lazy(() => admin().then((m) => ({ default: m.AdminSessions })));
const AdminSessionEdit = lazy(() => admin().then((m) => ({ default: m.AdminSessionEdit })));
const AdminMapping = lazy(() => admin().then((m) => ({ default: m.AdminMapping })));
const AdminJournal = lazy(() => admin().then((m) => ({ default: m.AdminJournal })));
const AdminAdvisor = lazy(() => admin().then((m) => ({ default: m.AdminAdvisor })));

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <main className="app-main">{children}</main>
    </div>
  );
}

/** Everything below requires a signed-in member of the Pisga app. */
function Protected() {
  const { state, reload } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <Centered><Loading /></Centered>;
  if (state.status === 'error') return <Centered><LoadError onRetry={reload} /></Centered>;
  if (state.status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (state.me.role === null) return <NoAccess />;
  return (
    <AdvisorConversationProvider>
      <Suspense fallback={<Centered><Loading /></Centered>}>
        <Outlet />
      </Suspense>
    </AdvisorConversationProvider>
  );
}

function Only({ allow }: { allow: (role: Role | null) => boolean }) {
  const { role } = useMe();
  return allow(role) ? <Outlet /> : <Navigate to="/" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<Protected />}>
        <Route element={<Shell tabs />}>
          <Route index element={<Home />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/:number" element={<SessionDetail />} />
          <Route path="project" element={<Project />} />
          <Route element={<Only allow={isParticipant} />}>
            <Route path="journal" element={<Journal />} />
            <Route path="advisor" element={<Advisor />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<Only allow={isParticipant} />}>
          <Route element={<Shell />}>
            <Route path="journal/mapping/:round" element={<Mapping />} />
            <Route path="journal/map" element={<LeadershipMap />} />
            <Route path="journal/export" element={<JournalExport />} />
          </Route>
          <Route element={<Shell flat />}>
            <Route path="journal/station/:number" element={<Station />} />
          </Route>
        </Route>

        <Route element={<Only allow={isStaff} />}>
          <Route element={<Shell tabs wide />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="sessions" replace />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="sessions/:number" element={<AdminSessionEdit />} />
              <Route path="mapping" element={<AdminMapping />} />
              <Route path="journal" element={<AdminJournal />} />
              <Route path="advisor" element={<AdminAdvisor />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
