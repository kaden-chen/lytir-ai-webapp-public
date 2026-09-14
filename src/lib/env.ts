const REQUIRED_KEYS = [
  "VITE_APP_VERSION",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_MAP_STYLE_LIGHT",
  "VITE_MAP_STYLE_DARK",
  "VITE_API_DIAG_URL",
  "VITE_API_EARTHQUAKES_URL",
  "VITE_API_AI_QA_URL",
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

type EnvSource = Partial<Record<RequiredKey, string | undefined>>;

export function findMissingEnv(source: EnvSource): RequiredKey[] {
  return REQUIRED_KEYS.filter((key) => !source[key]?.trim());
}

export const env = {
  appVersion: import.meta.env.VITE_APP_VERSION,
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  mapStyle: {
    light: import.meta.env.VITE_MAP_STYLE_LIGHT,
    dark: import.meta.env.VITE_MAP_STYLE_DARK,
  },
  // Each API is configured as its own full URL rather than a shared base with
  // paths in code, so an endpoint can be repointed without a release.
  api: {
    diag: import.meta.env.VITE_API_DIAG_URL,
    earthquakes: import.meta.env.VITE_API_EARTHQUAKES_URL,
    aiQa: import.meta.env.VITE_API_AI_QA_URL,
  },
} as const;

export const missingEnv = findMissingEnv(import.meta.env);
