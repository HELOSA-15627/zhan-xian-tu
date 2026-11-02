import type {
  AtlasProject,
  BackgroundSettings,
  ImportedMap,
} from "./types";

export function backgroundForMap(map: ImportedMap): BackgroundSettings {
  return {
    dataUrl: map.dataUrl,
    opacity: map.opacity,
    grayscale: map.grayscale,
    contrast: map.contrast,
    brightness: map.brightness,
    blur: map.blur,
    noise: map.noise,
    contourEnabled: map.contourEnabled,
    contourLevels: map.contourLevels,
    contourOpacity: map.contourOpacity,
    contourPaths: map.contourPaths,
    contourImage: map.contourImage,
    excludeBlue: map.excludeBlue,
  };
}

export function syncActiveMapState(project: AtlasProject): AtlasProject {
  const map = project.maps.find((item) => item.id === project.activeMapId);
  if (!map) return project;
  map.layers = structuredClone(project.layers);
  map.objects = structuredClone(project.objects);
  const background = project.background;
  map.opacity = background.opacity;
  map.grayscale = background.grayscale;
  map.contrast = background.contrast;
  map.brightness = background.brightness;
  map.blur = background.blur;
  map.noise = background.noise;
  map.contourEnabled = background.contourEnabled;
  map.contourLevels = background.contourLevels;
  map.contourOpacity = background.contourOpacity;
  map.contourPaths = structuredClone(background.contourPaths);
  map.contourImage = background.contourImage;
  map.excludeBlue = background.excludeBlue;
  return project;
}

export function hydrateActiveMapState(project: AtlasProject): AtlasProject {
  const map = project.maps.find((item) => item.id === project.activeMapId);
  if (!map) return project;
  return {
    ...project,
    width: map.width,
    height: map.height,
    background: backgroundForMap(map),
    layers: structuredClone(map.layers),
    objects: structuredClone(map.objects),
  };
}
