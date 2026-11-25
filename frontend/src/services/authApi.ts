import type { CoachOverview, Me } from '../types/api';
import { get, post } from './http';

/** Alleen wat de gedeelde coachpagina nodig heeft: login en het coachoverzicht. */
export const authApi = {
  me: () => get<Me>('/auth/me'),
  login: (password: string) => post<{ role: Me['role'] }>('/auth/login', { password }),
  logout: () => post<{ ok: true }>('/auth/logout'),
  coach: () => get<CoachOverview>('/share/coach'),
};
