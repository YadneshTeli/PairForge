export interface GithubRepo {
  language: string | null;
}

export interface GithubLanguage {
  name: string;
  repos: number;
}

export function languagesFromRepos(repos: GithubRepo[]): GithubLanguage[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([name, repos]) => ({ name, repos }));
}

export async function fetchGithubLanguages(username: string): Promise<GithubLanguage[]> {
  const response = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'PairForge',
      },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 404) {
    const error = new Error('GitHub user not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  if (!response.ok) {
    const error = new Error('GitHub is unavailable');
    (error as Error & { status?: number }).status = 502;
    throw error;
  }
  const repos = (await response.json()) as GithubRepo[];
  return languagesFromRepos(Array.isArray(repos) ? repos : []);
}
