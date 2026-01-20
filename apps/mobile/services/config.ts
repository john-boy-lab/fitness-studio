import Constants from 'expo-constants';

interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  s3Endpoint: string;
  s3Bucket: string;
}

function getConfig(): Config {
  const extra = Constants.expoConfig?.extra ?? {};

  return {
    supabaseUrl: extra.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:8000',
    supabaseAnonKey: extra.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    s3Endpoint: extra.S3_ENDPOINT ?? process.env.EXPO_PUBLIC_S3_ENDPOINT ?? 'http://localhost:9000',
    s3Bucket: extra.S3_BUCKET ?? process.env.EXPO_PUBLIC_S3_BUCKET ?? 'fitness-studio',
  };
}

export const config = getConfig();
