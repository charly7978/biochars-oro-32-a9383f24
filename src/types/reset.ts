
/**
 * Common reset interfaces for components that need to be reset
 */

export interface ResetHandle {
  reset: () => void;
}

export interface AdvancedResetHandle extends ResetHandle {
  fullReset: () => void;
}

export interface ConfigurableResetHandle extends ResetHandle {
  configure: (options: any) => void;
}
