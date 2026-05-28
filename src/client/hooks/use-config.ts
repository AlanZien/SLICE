import { useCallback, useMemo, useState } from 'react';
import type { DefaultConfig, SliceConfig, UpstreamAuth } from '@shared/types';
import { sliceConfigSchema } from '@shared/config-schema';

export type ConfigField = keyof SliceConfig;

export interface UseConfigApi {
  config: SliceConfig;
  errors: Partial<Record<ConfigField, string>>;
  isValid: boolean;
  setField: <K extends ConfigField>(field: K, value: SliceConfig[K]) => void;
  /**
   * Set the upstream auth in one go — its shape changes with `type`
   * (apiKey needs `headerName`, others don't), so we expose a dedicated
   * setter rather than letting callers spread arbitrary props.
   */
  setUpstreamAuth: (auth: UpstreamAuth) => void;
}

function initialConfig(defaults: DefaultConfig): SliceConfig {
  return {
    mcpName: defaults.mcpName,
    baseUrl: defaults.baseUrl,
    upstreamAuth: defaults.upstreamAuth,
    // SPEC R1.3.2 — "Les deux" (stdio + HTTP) is the recommended default.
    mode: 'both',
    mcpServerToken: defaults.mcpServerToken,
    includeParamDescriptions: true,
    retryOnServerError: false,
  };
}

export function useConfig(defaults: DefaultConfig): UseConfigApi {
  const [config, setConfig] = useState<SliceConfig>(() => initialConfig(defaults));

  const setField = useCallback(<K extends ConfigField>(field: K, value: SliceConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setUpstreamAuth = useCallback((auth: UpstreamAuth) => {
    setConfig((prev) => ({ ...prev, upstreamAuth: auth }));
  }, []);

  const { errors, isValid } = useMemo(() => {
    // Normalise an empty mcpServerToken to undefined so Zod's "optional()"
    // branch fires in local mode. An empty string is neither a valid token
    // nor "absent" without this nudge.
    const normalised = {
      ...config,
      mcpServerToken: config.mcpServerToken === '' ? undefined : config.mcpServerToken,
    };
    const result = sliceConfigSchema.safeParse(normalised);
    if (result.success) return { errors: {}, isValid: true };
    const errs: Partial<Record<ConfigField, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !(key in errs)) {
        errs[key as ConfigField] = issue.message;
      }
    }
    return { errors: errs, isValid: false };
  }, [config]);

  return { config, errors, isValid, setField, setUpstreamAuth };
}
