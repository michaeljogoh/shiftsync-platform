import 'server-only';

import { serverFetch } from './client';

export interface SkillSummary {
  id: string;
  name: string;
}

export async function fetchSkills(params?: { token?: string }): Promise<SkillSummary[]> {
  return serverFetch<SkillSummary[]>('/skills', {
    token: params?.token,
    tags: ['skills'],
  });
}
