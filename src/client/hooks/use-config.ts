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

/**
 * Normalise an empty `mcpServerToken` to `undefined` so it never leaks to
 * downstream consumers as an empty string. Zod's `.optional()` branch
 * relies on `undefined`, and the generation endpoint (phase 07) will reject
 * an empty-string token immediately.
 */
function normalise(config: SliceConfig): SliceConfig {
  if (config.mcpServerToken === '') {
    return { ...config, mcpServerToken: undefined };
  }
  return config;
}

export function useConfig(defaults: DefaultConfig): UseConfigApi {
  const [rawConfig, setConfig] = useState<SliceConfig>(() => initialConfig(defaults));
  const config = useMemo(() => normalise(rawConfig), [rawConfig]);

  const setField = useCallback(<K extends ConfigField>(field: K, value: SliceConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setUpstreamAuth = useCallback((auth: UpstreamAuth) => {
    setConfig((prev) => ({ ...prev, upstreamAuth: auth }));
  }, []);

  const { errors, isValid } = useMemo(() => {
    const result = sliceConfigSchema.safeParse(config);
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
