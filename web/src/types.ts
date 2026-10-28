export interface Session {
  token: string;
  user: { id: string; email: string; username: string; isAdmin: boolean };
  profile: Profile;
}

export interface Skill {
  name: string;
  proficiency: number;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  role: string | null;
  bio: string | null;
  location: string | null;
  experienceLevel: string | null;
  interests: string[];
  connectionIntent: string | null;
  visibility: string;
  skills: Skill[];
}

export interface PersonRef {
  id: string;
  displayName: string;
  role: string | null;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  tagline: string;
  description: string;
  stage: string;
  lookingFor: string[];
  tags: string[];
  owner?: PersonRef;
  successScore?: number | null;
  ratingCount?: number | null;
  band?: string | null;
}

export interface Criterion {
  key: string;
  label: string;
}

export interface ConnectionRequest {
  id: string;
  status: string;
  ratings: Record<string, number>;
  requester: PersonRef;
}

export interface MatchSummary {
  id: string;
  kind: string;
  projectTitle: string | null;
  unreadCount: number;
  other: PersonRef;
  lastMessage: { content: string; createdAt: string } | null;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface Compatibility {
  score: number;
  source: string;
  components: Record<string, number>;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  location: string | null;
  isOnline: boolean;
  url: string | null;
  participantCount: number;
  joined: boolean;
  creatorName: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
}

export const ROLES = [
  ['founder', 'Founder'],
  ['cofounder', 'Cofounder'],
  ['vc', 'VC'],
  ['developer', 'Developer'],
  ['freelancer', 'Freelancer'],
  ['student', 'Student'],
] as const;

export const STAGES = ['idea', 'prototype', 'mvp', 'launched'] as const;
export const LOOKING = ['cofounder', 'funding', 'developer', 'freelancer', 'feedback'] as const;
