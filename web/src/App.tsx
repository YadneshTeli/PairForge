import type { ReactNode } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import {
  ChatPage,
  PairPage,
  EventFormPage,
  EventPage,
  EventsPage,
  FeedPage,
  LoginPage,
  MatchesPage,
  MyProjectsPage,
  NotificationsPage,
  PeoplePage,
  PersonPage,
  ProfilePage,
  ProjectFormPage,
  ProjectPage,
  RequestsPage,
  RolePage,
  SignupPage,
} from './screens';

function Gate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!session.profile.role) return <Navigate to="/onboarding" replace />;
  return children;
}

function Shell() {
  const { session, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <strong>PairForge</strong>
        <div className="row">
          <span>{session?.profile.displayName}</span>
          <NavLink to="/notifications">Notifications</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <button className="ghost" type="button" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
      <nav className="nav">
        <NavLink to="/feed">Feed</NavLink>
        <NavLink to="/mine">Mine</NavLink>
        <NavLink to="/matches">Matches</NavLink>
        <NavLink to="/people">People</NavLink>
        <NavLink to="/events">Events</NavLink>
      </nav>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/onboarding" element={<RolePage />} />
      <Route element={<Gate><Shell /></Gate>}>
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/mine" element={<MyProjectsPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="/projects/:id/requests" element={<RequestsPage />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/matches/:id/pair" element={<PairPage />} />
        <Route path="/matches/:id" element={<ChatPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/people/:id" element={<PersonPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Route>
    </Routes>
  );
}
