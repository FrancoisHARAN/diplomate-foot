const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const getHeaders = (prefer?: string): HeadersInit => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
  ...(prefer ? { Prefer: prefer } : {}),
});

const buildUrl = (path: string): string => `${supabaseUrl}/rest/v1/${path}`;

export const supabase = isSupabaseConfigured
  ? {
      async select<T>(path: string): Promise<T[]> {
        const response = await fetch(buildUrl(path), { headers: getHeaders() });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        return (await response.json()) as T[];
      },

      async insert<T>(path: string, payload: object | object[], upsert = false): Promise<T[]> {
        const response = await fetch(buildUrl(path), {
          method: 'POST',
          headers: getHeaders(upsert ? 'resolution=merge-duplicates,return=representation' : 'return=representation'),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return (await response.json()) as T[];
      },

      async patch<T>(path: string, payload: object): Promise<T[]> {
        const response = await fetch(buildUrl(path), {
          method: 'PATCH',
          headers: getHeaders('return=representation'),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return (await response.json()) as T[];
      },
    }
  : null;
