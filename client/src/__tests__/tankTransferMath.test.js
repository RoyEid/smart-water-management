import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePostTransferLevels,
  calculateTankTransfer,
} from "../utils/tankTransferMath.js";

/**
 * Unit tests for capacity-aware tank transfer math (Issue 2) and configuration safety (Issue 1).
 */

test("Test 1: Same capacity (1000 L Upper vs 1000 L Lower) 50 L transfer", () => {
  const transferInfo = calculateTankTransfer({
    upperPercentage: 20.0,
    upperCapacityLiters: 1000,
    lowerPercentage: 60.0,
    lowerCapacityLiters: 1000,
  });

  assert.equal(transferInfo.upperCurrentLiters, 200);
  assert.equal(transferInfo.upperLitersNeeded, 700); // 900 - 200
  assert.equal(transferInfo.lowerCurrentLiters, 600);
  assert.equal(transferInfo.lowerAvailableLiters, 500); // 600 - 100
  assert.equal(transferInfo.maximumSafeTransferLiters, 500); // min(700, 500)

  const postTransfer = calculatePostTransferLevels({
    upperCurrentLiters: 200,
    lowerCurrentLiters: 600,
    transferLiters: 50,
    upperCapacityLiters: 1000,
    lowerCapacityLiters: 1000,
  });

  assert.equal(postTransfer.newUpperLiters, 250);
  assert.equal(postTransfer.newUpperPercentage, 25.0); // +5%
  assert.equal(postTransfer.newLowerLiters, 550);
  assert.equal(postTransfer.newLowerPercentage, 55.0); // -5%
});

test("Test 2: Different capacity (1000 L Upper vs 500 L Lower) 50 L transfer yields different % movement", () => {
  const transferInfo = calculateTankTransfer({
    upperPercentage: 20.0,
    upperCapacityLiters: 1000,
    lowerPercentage: 60.0,
    lowerCapacityLiters: 500,
  });

  assert.equal(transferInfo.upperCurrentLiters, 200);
  assert.equal(transferInfo.upperLitersNeeded, 700); // 900 - 200
  assert.equal(transferInfo.lowerCurrentLiters, 300); // 60% of 500
  assert.equal(transferInfo.lowerAvailableLiters, 250); // 300 - 50 (10% reserve of 500)
  assert.equal(transferInfo.maximumSafeTransferLiters, 250); // min(700, 250)

  const postTransfer = calculatePostTransferLevels({
    upperCurrentLiters: 200,
    lowerCurrentLiters: 300,
    transferLiters: 50,
    upperCapacityLiters: 1000,
    lowerCapacityLiters: 500,
  });

  assert.equal(postTransfer.newUpperLiters, 250);
  assert.equal(postTransfer.newUpperPercentage, 25.0); // 250 / 1000 = 25% (+5%)
  assert.equal(postTransfer.newLowerLiters, 250);
  assert.equal(postTransfer.newLowerPercentage, 50.0); // 250 / 500 = 50% (-10%)
});

test("Test 3: Lower cannot fully fill Upper (needed = 700 L, available = 250 L -> safe max transfer = 250 L)", () => {
  const transferInfo = calculateTankTransfer({
    upperPercentage: 20.0,
    upperCapacityLiters: 1000,
    upperTargetPercentage: 90.0,
    lowerPercentage: 60.0,
    lowerCapacityLiters: 500,
    lowerMinimumPercentage: 10.0,
  });

  assert.equal(transferInfo.upperLitersNeeded, 700);
  assert.equal(transferInfo.lowerAvailableLiters, 250);
  assert.equal(transferInfo.maximumSafeTransferLiters, 250);
  assert.equal(transferInfo.isTransferPossible, true);
});

test("Test 4: Upper nearly full (needed = 20 L, available = 200 L -> safe max transfer = 20 L)", () => {
  const transferInfo = calculateTankTransfer({
    upperPercentage: 88.0,
    upperCapacityLiters: 1000,
    upperTargetPercentage: 90.0,
    lowerPercentage: 50.0,
    lowerCapacityLiters: 500,
    lowerMinimumPercentage: 10.0,
  });

  assert.equal(transferInfo.upperCurrentLiters, 880);
  assert.equal(transferInfo.upperLitersNeeded, 20); // 900 - 880
  assert.equal(transferInfo.lowerAvailableLiters, 200); // 250 - 50
  assert.equal(transferInfo.maximumSafeTransferLiters, 20); // min(20, 200)
});

test("Test 5: Lower at reserve (available = 0 L -> transfer not possible, pump remains OFF)", () => {
  const transferInfo = calculateTankTransfer({
    upperPercentage: 20.0,
    upperCapacityLiters: 1000,
    lowerPercentage: 10.0,
    lowerCapacityLiters: 500,
  });

  assert.equal(transferInfo.lowerCurrentLiters, 50);
  assert.equal(transferInfo.lowerAvailableLiters, 0);
  assert.equal(transferInfo.maximumSafeTransferLiters, 0);
  assert.equal(transferInfo.isTransferPossible, false);
});

test("Test 6: Invalid or missing capacity handles safely without fake values or errors", () => {
  const missingCap = calculateTankTransfer({
    upperPercentage: 20.0,
    upperCapacityLiters: null,
    lowerPercentage: 60.0,
    lowerCapacityLiters: 500,
  });

  assert.equal(missingCap.maximumSafeTransferLiters, null);
  assert.equal(missingCap.isTransferPossible, false);

  const postNull = calculatePostTransferLevels({
    upperCurrentLiters: null,
    lowerCurrentLiters: 300,
    transferLiters: 50,
    upperCapacityLiters: 1000,
    lowerCapacityLiters: 500,
  });

  assert.equal(postNull, null);
});

test("Test 7: User exact example: 100% full Lower (500 L) cannot fully fill Upper (1000 L @ 20%) to 90%", () => {
  const transferInfo = calculateTankTransfer({
    upperPercentage: 20.0,
    upperCapacityLiters: 1000,
    upperTargetPercentage: 90.0,
    lowerPercentage: 100.0,
    lowerCapacityLiters: 500,
    lowerMinimumPercentage: 10.0,
  });

  assert.equal(transferInfo.upperCurrentLiters, 200);
  assert.equal(transferInfo.upperLitersNeeded, 700); // 900 - 200 = 700 L
  assert.equal(transferInfo.lowerCurrentLiters, 500); // 100% of 500 = 500 L
  assert.equal(transferInfo.lowerAvailableLiters, 450); // 500 - 50 = 450 L
  assert.equal(transferInfo.maximumSafeTransferLiters, 450); // min(700, 450)

  const postTransfer = calculatePostTransferLevels({
    upperCurrentLiters: 200,
    lowerCurrentLiters: 500,
    transferLiters: 450,
    upperCapacityLiters: 1000,
    lowerCapacityLiters: 500,
  });

  assert.equal(postTransfer.newUpperLiters, 650);
  assert.equal(postTransfer.newUpperPercentage, 65.0); // 650 / 1000 = 65%
  assert.equal(postTransfer.newLowerLiters, 50);
  assert.equal(postTransfer.newLowerPercentage, 10.0); // 50 / 500 = 10% (reserve reached!)
});

test("Test 8: Upper 500 L @ 20% vs Lower 1000 L @ 80%: Lower has enough water (needed = 350 L, available = 700 L)", () => {
  const transferInfo = calculateTankTransfer({
    upperPercentage: 20.0,
    upperCapacityLiters: 500,
    upperTargetPercentage: 90.0,
    lowerPercentage: 80.0,
    lowerCapacityLiters: 1000,
    lowerMinimumPercentage: 10.0,
  });

  assert.equal(transferInfo.upperCurrentLiters, 100);
  assert.equal(transferInfo.upperTargetLiters, 450);
  assert.equal(transferInfo.upperLitersNeeded, 350); // 450 - 100
  assert.equal(transferInfo.lowerCurrentLiters, 800);
  assert.equal(transferInfo.lowerAvailableLiters, 700); // 800 - 100
  assert.equal(transferInfo.maximumSafeTransferLiters, 350); // min(350, 700)
});
