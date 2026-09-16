/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_MAP_STYLE_LIGHT: string;
  readonly VITE_MAP_STYLE_DARK: string;
  readonly VITE_API_DIAG_URL: string;
  readonly VITE_API_EARTHQUAKES_URL: string;
  readonly VITE_API_AI_QA_URL: string;
  readonly VITE_API_ADMIN_SYNC_DATA_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
