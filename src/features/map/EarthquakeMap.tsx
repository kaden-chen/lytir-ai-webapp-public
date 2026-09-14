import type { RefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { useComputedColorScheme } from "@mantine/core";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
} from "react-map-gl/maplibre";
import type {
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  MapRef,
} from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibre";
import { basemapStyleUrl } from "@/features/map/basemap";
import { EarthquakeDetails } from "@/features/map/EarthquakeDetails";
import type {
  EarthquakeProperties,
  SelectedEarthquake,
} from "@/features/map/earthquakes";
import { readFeatureProperties } from "@/features/map/earthquakes";
import {
  EARTHQUAKE_CLUSTER_LAYER_ID,
  EARTHQUAKE_CLUSTER_MAX_ZOOM,
  EARTHQUAKE_POINT_LAYER_ID,
  EARTHQUAKE_SOURCE_ID,
  MAX_MAGNITUDE_PROPERTY,
  earthquakeClusterCountLayer,
  earthquakeClusterLayer,
  earthquakePointLayer,
} from "@/features/map/earthquakeLayers";
import "@/features/map/popup.css";

// A whole-world view, because the data this carries is global.
const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 20,
  zoom: 1.5,
};

// Hoisted rather than written inline. This is an initialisation option, and a
// fresh object on every render invites react-map-gl to treat it as a changed
// prop.
const ATTRIBUTION = { compact: true } as const;

interface EarthquakeMapProps {
  /** Held by the screen, which flies the map when a list row is chosen. */
  mapRef: RefObject<MapRef | null>;
  data: FeatureCollection<Point, EarthquakeProperties>;
  selected: SelectedEarthquake | null;
  onSelect: (selected: SelectedEarthquake | null) => void;
}

function featureFromLayer(event: MapLayerMouseEvent, layerId: string) {
  return event.features?.find((feature) => feature.layer.id === layerId);
}

// Indexed access is checked, and a feature that is not a point has no single
// position to anchor a popup to.
function pointPosition(
  feature: MapGeoJSONFeature,
): [number, number] | undefined {
  if (feature.geometry.type !== "Point") {
    return undefined;
  }

  const [longitude, latitude] = feature.geometry.coordinates;

  return typeof longitude === "number" && typeof latitude === "number"
    ? [longitude, latitude]
    : undefined;
}

export function EarthquakeMap({
  mapRef,
  data,
  selected,
  onSelect,
}: EarthquakeMapProps) {
  const colorScheme = useComputedColorScheme("light");
  const hoveredRef = useRef<string | number | null>(null);
  // Only the cursor lives in React state, and it changes on entering or leaving
  // a mark rather than on every pointer move. The source data stays memoised,
  // so this does not rebuild it; the hover appearance itself is feature-state.
  const [overMark, setOverMark] = useState(false);

  const clearHover = useCallback((map: MapLayerMouseEvent["target"]) => {
    if (hoveredRef.current === null) {
      return;
    }

    map.removeFeatureState({
      source: EARTHQUAKE_SOURCE_ID,
      id: hoveredRef.current,
    });
    hoveredRef.current = null;
  }, []);

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      // Clusters are clickable too, so the cursor answers for any mark, while
      // the ring highlight belongs only to a single event.
      const id = featureFromLayer(event, EARTHQUAKE_POINT_LAYER_ID)?.id ?? null;

      setOverMark((event.features?.length ?? 0) > 0);

      if (id === hoveredRef.current) {
        return;
      }

      clearHover(event.target);

      if (id !== null) {
        event.target.setFeatureState(
          { source: EARTHQUAKE_SOURCE_ID, id },
          { hover: true },
        );
        hoveredRef.current = id;
      }
    },
    [clearHover],
  );

  const handleMouseOut = useCallback(
    (event: MapLayerMouseEvent) => {
      setOverMark(false);
      clearHover(event.target);
    },
    [clearHover],
  );

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = event.target;
      const cluster = featureFromLayer(event, EARTHQUAKE_CLUSTER_LAYER_ID);

      // A numbered circle is an invitation to drill in, not a thing with
      // details of its own, so a cluster zooms to where it breaks apart.
      if (cluster) {
        onSelect(null);
        const clusterId = cluster.properties.cluster_id;
        const centre = pointPosition(cluster);
        const source = map.getSource(EARTHQUAKE_SOURCE_ID) as
          GeoJSONSource | undefined;

        if (typeof clusterId === "number" && centre && source) {
          void source
            .getClusterExpansionZoom(clusterId)
            .then((zoom) => map.easeTo({ center: centre, zoom }))
            // The source can be replaced by a refetch while this is in flight,
            // and failing to zoom is not worth an error to the user.
            .catch(() => undefined);
        }

        return;
      }

      const point = featureFromLayer(event, EARTHQUAKE_POINT_LAYER_ID);
      const position = point && pointPosition(point);

      // Clicking bare map closes the popup, which is the gesture people expect.
      onSelect(
        point && position
          ? {
              longitude: position[0],
              latitude: position[1],
              properties: readFeatureProperties(point.properties),
            }
          : null,
      );
    },
    [onSelect],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW_STATE}
      // A sphere has no antimeridian and no repeated world copies, so the
      // Pacific reads as one region instead of being split by the edge of a
      // cylindrical projection. MapLibre falls back to mercator on its own at
      // high zoom, where the curvature stops being useful.
      projection="globe"
      mapStyle={basemapStyleUrl(colorScheme)}
      style={{ width: "100%", height: "100%" }}
      // Collapsed behind its information button rather than set as a run of
      // text. MapLibre only compacts itself below a width threshold, and the
      // panel leaves the map narrower than that threshold assumes: the credit
      // wrapped onto two lines and sat over the basemap's own labels. The
      // attribution is still one click away, which is what the licence asks.
      attributionControl={ATTRIBUTION}
      interactiveLayerIds={[
        EARTHQUAKE_POINT_LAYER_ID,
        EARTHQUAKE_CLUSTER_LAYER_ID,
      ]}
      onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
      onClick={handleClick}
      cursor={overMark ? "pointer" : "grab"}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" />
      <Source
        id={EARTHQUAKE_SOURCE_ID}
        type="geojson"
        data={data}
        promoteId="id"
        cluster
        clusterRadius={50}
        clusterMaxZoom={EARTHQUAKE_CLUSTER_MAX_ZOOM}
        clusterProperties={{
          [MAX_MAGNITUDE_PROPERTY]: [
            "max",
            ["coalesce", ["get", "magnitude"], 0],
          ],
        }}
      >
        <Layer {...earthquakeClusterLayer} />
        <Layer {...earthquakeClusterCountLayer} />
        <Layer {...earthquakePointLayer} />
      </Source>
      {selected ? (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          onClose={() => onSelect(null)}
          // The screen's own click handler decides when the popup closes, so
          // clicking straight from one event to another replaces the popup
          // instead of dismissing and reopening it.
          closeOnClick={false}
          maxWidth="260px"
        >
          <EarthquakeDetails properties={selected.properties} />
        </Popup>
      ) : null}
    </Map>
  );
}
