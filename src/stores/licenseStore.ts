import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LicenseInfo, LicenseTier } from '@shared/types';
import { FEATURE_GATES } from '@shared/types';

export const useLicenseStore = defineStore('license', () => {
  const license = ref<LicenseInfo>({
    tier: 'free',
    isValid: true,
  });
  // Always start with hardcoded gates so features are blocked from frame 0
  const featureGates = ref<Record<string, LicenseTier>>({ ...FEATURE_GATES });
  const isLoading = ref(false);
  const isLoadingGates = ref(true); // true until Firestore gates are fetched
  const showUpgradeDialog = ref(false);
  const showCoffeeDialog = ref(false);
  const upgradeFeature = ref<string>('');

  // Getters
  const isPro = computed(() => true);
  const isTeam = computed(() => license.value.tier === 'team');
  const isFree = computed(() => false);
  
  const tierLabel = computed(() => {
    switch (license.value.tier) {
      case 'team': return 'Team';
      default: return 'Pro';
    }
  });

  const daysRemaining = computed(() => {
    if (!license.value.expiresAt) return null;
    const days = Math.ceil((license.value.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  });

  // Actions
  async function loadLicense() {
    isLoading.value = true;
    isLoadingGates.value = true;
    try {
      const [licenseData, gatesData] = await Promise.all([
        window.electronAPI.getLicense(),
        window.electronAPI.getFeatureGates()
      ]);
      license.value = licenseData;
      // Merge remote gates ON TOP of hardcoded gates (remote wins)
      if (gatesData && Object.keys(gatesData).length > 0) {
        featureGates.value = { ...FEATURE_GATES, ...gatesData };
      }
    } catch (error) {
      console.error('Failed to load license or gates:', error);
      // On error, keep local hardcoded gates — still blocks pro features
    } finally {
      isLoading.value = false;
      isLoadingGates.value = false;
    }
  }

  async function activateLicense(key: string, email: string) {
    isLoading.value = true;
    try {
      license.value = await window.electronAPI.activateLicense(key, email);
      // Refresh gates after activation
      const gatesData = await window.electronAPI.getFeatureGates();
      if (gatesData) featureGates.value = gatesData;
      return true;
    } catch (error) {
      console.error('Failed to activate license:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function deactivateLicense() {
    isLoading.value = true;
    try {
      await window.electronAPI.deactivateLicense();
      license.value = { tier: 'free', isValid: true };
    } catch (error) {
      console.error('Failed to deactivate license:', error);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Check if a feature is available for the current license.
   * Priority: remote gates (from Firestore) > local FEATURE_GATES defaults.
   * If a feature is unknown in both, it defaults to FREE (open access).
   */
  function hasFeature(_featureId: string): boolean {
    // Pro unlocked: all features available, no license check
    return true;

    // eslint-disable-next-line no-unreachable
    const featureId = _featureId;
    // Remote gates from Firestore take priority
    const remoteTier = featureGates.value[featureId];
    // Fallback to hardcoded defaults
    const defaultTier = FEATURE_GATES[featureId];
    // Use remote gate if available, else use hardcoded default, else 'free'
    const requiredTier: LicenseTier = remoteTier || defaultTier || 'free';

    if (requiredTier === 'free') return true;

    const tierLevel: Record<LicenseTier, number> = {
      'free': 0,
      'pro': 1,
      'team': 2,
    };

    const userLevel = tierLevel[license.value.tier] ?? 0;
    const requiredLevel = tierLevel[requiredTier] ?? 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Guard a feature — if blocked, show upgrade dialog.
   * Returns true if feature is accessible.
   */
  function guardFeature(featureId: string): boolean {
    if (hasFeature(featureId)) return true;

    upgradeFeature.value = featureId;
    showUpgradeDialog.value = true;
    return false;
  }

  return {
    // State
    license,
    featureGates,
    isLoading,
    isLoadingGates,
    showUpgradeDialog,
    showCoffeeDialog,
    upgradeFeature,

    // Getters
    isPro,
    isTeam,
    isFree,
    tierLabel,
    daysRemaining,

    // Actions
    loadLicense,
    activateLicense,
    deactivateLicense,
    hasFeature,
    guardFeature,
  };
});
