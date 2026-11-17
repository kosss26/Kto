import { ASSET_VERSIONS } from "./asset-versions";

/** "/voice/bravo.mp3" → "/voice/bravo.mp3?v=1a2b3c4d" (cache-busting for the immutable media cache). */
export function asset(path: string) {
  const folder = path.split("/")[1];
  const v = ASSET_VERSIONS[folder];
  return v ? `${path}?v=${v}` : path;
}
