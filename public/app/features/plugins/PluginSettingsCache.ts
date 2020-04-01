import { getBackendSrv } from '@grafana/runtime';
import { PluginMeta } from '@grafana/data';

type PluginCache = {
  [key: string]: PluginMeta;
};

const pluginInfoCache: PluginCache = {};

export function getPluginSettings(pluginId: string): Promise<PluginMeta> {
  const v = pluginInfoCache[pluginId];
  if (v) {
    return Promise.resolve(v);
  }
  return getBackendSrv()
    .get(`/api/plugins/${pluginId}/settings`)
    .then((settings: any) => {
      if ('module' in settings) {
        if (!settings.module.endsWith('.js')) {
          settings.module += '.js';
        }

        if (!settings.module.startsWith('/')) {
          settings.module = `/public/${settings.module}`;
        }
      }

      pluginInfoCache[pluginId] = settings;
      return settings;
    })
    .catch((err: any) => {
      // err.isHandled = true;
      // @todo should reject an `Error`
      return Promise.reject('Unknown Plugin');
    });
}
