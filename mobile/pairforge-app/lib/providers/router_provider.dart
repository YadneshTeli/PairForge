import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/chat/chat_screen.dart';
import '../features/chat/pair_screen.dart';
import '../features/chat/matches_screen.dart';
import '../features/events/event_detail_screen.dart';
import '../features/events/events_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/people/people_screen.dart';
import '../features/people/person_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/projects/my_projects_screen.dart';
import '../features/projects/project_detail_screen.dart';
import '../features/projects/project_feed_screen.dart';
import '../features/projects/project_form_screen.dart';
import '../features/projects/requests_screen.dart';
import '../ui/shell.dart';
import 'auth_provider.dart';

final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authStateProvider, (previous, next) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authStateProvider);
      final location = state.matchedLocation;
      if (!auth.ready) return location == '/splash' ? null : '/splash';
      final authRoute = location == '/login' || location == '/signup';
      if (!auth.isAuthenticated) return authRoute ? null : '/login';
      if (auth.role == null) return location == '/onboarding' ? null : '/onboarding';
      if (authRoute || location == '/onboarding' || location == '/splash') return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
      GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/feed', builder: (context, state) => const ProjectFeedScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/mine', builder: (context, state) => const MyProjectsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/matches', builder: (context, state) => const MatchesScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/people', builder: (context, state) => const PeopleScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/events', builder: (context, state) => const EventsScreen())]),
        ],
      ),
      GoRoute(path: '/projects/new', parentNavigatorKey: _rootKey, builder: (context, state) => const ProjectFormScreen()),
      GoRoute(
        path: '/projects/:projectId/edit',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => ProjectFormScreen(projectId: state.pathParameters['projectId']),
      ),
      GoRoute(
        path: '/projects/:projectId/requests',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => RequestsScreen(projectId: state.pathParameters['projectId']!),
      ),
      GoRoute(
        path: '/projects/:projectId',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => ProjectDetailScreen(projectId: state.pathParameters['projectId']!),
      ),
      GoRoute(
        path: '/matches/:matchId/pair',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => PairScreen(matchId: state.pathParameters['matchId']!),
      ),
      GoRoute(
        path: '/matches/:matchId',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => ChatScreen(matchId: state.pathParameters['matchId']!),
      ),
      GoRoute(
        path: '/people/:profileId',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => PersonScreen(profileId: state.pathParameters['profileId']!),
      ),
      GoRoute(path: '/profile', parentNavigatorKey: _rootKey, builder: (context, state) => const ProfileScreen()),
      GoRoute(path: '/profile/edit', parentNavigatorKey: _rootKey, builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/events/new', parentNavigatorKey: _rootKey, builder: (context, state) => const CreateEventScreen()),
      GoRoute(
        path: '/events/:eventId',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => EventDetailScreen(eventId: state.pathParameters['eventId']!),
      ),
      GoRoute(path: '/notifications', parentNavigatorKey: _rootKey, builder: (context, state) => const NotificationsScreen()),
    ],
  );
});
