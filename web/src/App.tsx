import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { api } from './api';
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
import type { AppNotification } from './types';
import { Icon, type IconName, Mark } from './ui';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/feed', label: 'Feed', icon: 'feed' },
  { to: '/mine', label: 'Mine', icon: 'folder' },
  { to: '/matches', label: 'Matches', icon: 'chat' },
  { to: '/people', label: 'People', icon: 'people' },
  { to: '/events', label: 'Events', icon: 'calendar' },
];

function Gate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!session.profile.role) return <Navigate to="/onboarding" replace />;
  return children;
}

function PrimaryNav() {
  return (
    <>
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  );
}

function Shell() {
  const { session, logout } = useAuth();
  const notes = useQuery({
    queryKey: ['notes'],
    queryFn: () => api<{ notifications: AppNotification[] }>('/notifications'),
  });
  const unread = (notes.data?.notifications ?? []).filter((item) => !item.readAt).length;
  const name = session?.profile.displayName ?? 'You';

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="rail">
        <Link to="/feed" className="brand">
          <Mark />
          <span>PairForge</span>
        </Link>
        <nav className="rail-nav" aria-label="Primary">
          <PrimaryNav />
        </nav>
        <div className="rail-foot">
          <p className="who">{name}</p>
          <NavLink to="/notifications" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon name="bell" />
            <span>Notifications</span>
            {unread > 0 && <span className="count">{unread}</span>}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon name="user" />
            <span>Profile</span>
          </NavLink>
          <button className="ghost" type="button" onClick={logout}>
            <Icon name="logout" />
            Log out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="mobilebar">
          <Link to="/feed" className="brand">
            <Mark />
            <span>PairForge</span>
          </Link>
          <div className="row">
            <NavLink to="/notifications" className="nav-link" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}>
              <Icon name="bell" />
              {unread > 0 && <span className="count">{unread}</span>}
            </NavLink>
            <NavLink to="/profile" className="nav-link" aria-label="Profile">
              <Icon name="user" />
            </NavLink>
          </div>
        </header>
        <main id="main" className="page">
          <Outlet />
        </main>
      </div>
      <nav className="dock" aria-label="Primary">
        <PrimaryNav />
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
