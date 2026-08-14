import { hasValue } from "./telemetryFormat.js";

/**
 * Calculates volume-aware transfer capabilities between Lower (source) and Upper (destination) tanks.
 */
export function calculateTankTransfer({
  upperPercentage,
  upperCapacityLiters,
  upperTargetPercentage = 90.0,
  lowerPercentage,
  lowerCapacityLiters,
  lowerMinimumPercentage = 10.0,
}) {
  if (
    !hasValue(upperPercentage) ||
    !hasValue(upperCapacityLiters) ||
    upperCapacityLiters <= 0 ||
    !hasValue(lowerPercentage) ||
    !hasValue(lowerCapacityLiters) ||
    lowerCapacityLiters <= 0
  ) {
    return {
      upperCurrentLiters: null,
      upperTargetLiters: null,
      upperLitersNeeded: null,
      lowerCurrentLiters: null,
      lowerMinimumLiters: null,
      lowerAvailableLiters: null,
      maximumSafeTransferLiters: null,
      isTransferPossible: false,
    };
  }

  const upperClamped = Math.max(0, Math.min(100, upperPercentage));
  const lowerClamped = Math.max(0, Math.min(100, lowerPercentage));

  const upperCurrentLiters = (upperClamped / 100) * upperCapacityLiters;
  const upperTargetLiters = (upperTargetPercentage / 100) * upperCapacityLiters;
  const upperLitersNeeded = Math.max(0, upperTargetLiters - upperCurrentLiters);

  const lowerCurrentLiters = (lowerClamped / 100) * lowerCapacityLiters;
  const lowerMinimumLiters = (lowerMinimumPercentage / 100) * lowerCapacityLiters;
  const lowerAvailableLiters = Math.max(0, lowerCurrentLiters - lowerMinimumLiters);

  const maximumSafeTransferLiters = Math.min(upperLitersNeeded, lowerAvailableLiters);

  return {
    upperCurrentLiters,
    upperTargetLiters,
    upperLitersNeeded,
    lowerCurrentLiters,
    lowerMinimumLiters,
    lowerAvailableLiters,
    maximumSafeTransferLiters,
    isTransferPossible: maximumSafeTransferLiters > 0,
  };
}

/**
 * Computes resulting Liters and percentages after transferring transferLiters from Lower to Upper tank.
 */
export function calculatePostTransferLevels({
  upperCurrentLiters,
  lowerCurrentLiters,
  transferLiters,
  upperCapacityLiters,
  lowerCapacityLiters,
}) {
  if (
    !hasValue(upperCurrentLiters) ||
    !hasValue(lowerCurrentLiters) ||
    !hasValue(transferLiters) ||
    !hasValue(upperCapacityLiters) ||
    upperCapacityLiters <= 0 ||
    !hasValue(lowerCapacityLiters) ||
    lowerCapacityLiters <= 0
  ) {
    return null;
  }

  const actualTransfer = Math.max(0, Math.min(transferLiters, lowerCurrentLiters));

  const newUpperLiters = Math.min(upperCapacityLiters, upperCurrentLiters + actualTransfer);
  const newLowerLiters = Math.max(0, lowerCurrentLiters - actualTransfer);

  const newUpperPercentage = Number(((newUpperLiters / upperCapacityLiters) * 100).toFixed(2));
  const newLowerPercentage = Number(((newLowerLiters / lowerCapacityLiters) * 100).toFixed(2));

  return {
    actualTransferLiters: actualTransfer,
    newUpperLiters,
    newUpperPercentage,
    newLowerLiters,
    newLowerPercentage,
  };
}
