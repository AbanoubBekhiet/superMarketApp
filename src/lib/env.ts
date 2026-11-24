interface AppEnv {
  apiBaseUrl: string;
  useMocks: boolean;
}

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const rawUseMocks = process.env.EXPO_PUBLIC_USE_MOCKS;

export const env: AppEnv = {
  apiBaseUrl:
    typeof rawBaseUrl === 'string' && rawBaseUrl.length > 0
      ? rawBaseUrl
      : 'http://localhost:4000/api',
  useMocks: rawUseMocks !== 'false',
};
