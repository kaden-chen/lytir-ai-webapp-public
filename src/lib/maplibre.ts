import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// MapLibre derives its worker URL from its own module URL at runtime, expecting
// maplibre-gl-worker.mjs to sit beside it. Bundling breaks that: the built
// chunk requests /assets/maplibre-gl-worker.mjs, which was never emitted, so
// tile parsing never starts. The map then renders blank while the style,
// attribution, and controls all load and nothing throws in the browser.
//
// Vite bundles the worker and its shared dependency and gives us the emitted
// URL, which keeps the two in step through any build.
setWorkerUrl(workerUrl);
