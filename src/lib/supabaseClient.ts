type SupabaseLike = {
  from: (table: string) => {
    select: (...args: unknown[]) => any;
    insert: (...args: unknown[]) => any;
    upsert: (...args: unknown[]) => any;
    eq: (...args: unknown[]) => any;
    order: (...args: unknown[]) => any;
    limit: (...args: unknown[]) => any;
    single: () => any;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(false && supabaseUrl && supabaseAnonKey);
export const supabase: SupabaseLike | null = null;
