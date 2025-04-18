import { matchPath } from 'react-router';
import { getBaseUrl } from '../helpers/getBaseUrl';
import { isElectron } from '../helpers/isElectron';

/**
 * @returns A path prefixed with cluster path, and the given path.
 *
 * The given path does not start with a /, it will be added.
 */
export function getClusterPrefixedPath(path?: string | null) {
  const baseClusterPath = '/c/:cluster';
  if (!path) {
    return baseClusterPath;
  }
  return baseClusterPath + (path[0] === '/' ? '' : '/') + path;
}

/**
 * @returns The current cluster name, or null if not in a cluster context.
 */
export function getCluster(): string | null {
  const prefix = getBaseUrl();
  const urlPath = isElectron()
    ? window.location.hash.substring(1)
    : window.location.pathname.slice(prefix.length);

  const clusterURLMatch = matchPath<{ cluster?: string }>(urlPath, {
    path: getClusterPrefixedPath(),
  });
  return (!!clusterURLMatch && clusterURLMatch.params.cluster) || null;
}

/**
 * Gets clusters.
 *
 * @param returnWhenNoClusters return this value when no clusters are found.
 * @returns the cluster group from the URL.
 */
export function getClusterGroup(returnWhenNoClusters: string[] = []): string[] {
  const clusterFromURL = getCluster();
  return clusterFromURL?.split('+') || returnWhenNoClusters;
}
