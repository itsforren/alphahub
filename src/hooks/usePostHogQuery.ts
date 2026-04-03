import { useQuery } from '@tanstack/react-query';

export function usePostHogQuery(query: string, options?: { enabled?: boolean; staleTime?: number }) {
  return useQuery({
    queryKey: ['posthog', query],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/posthog-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: options?.staleTime ?? 60_000,
    enabled: options?.enabled !== false,
  });
}
