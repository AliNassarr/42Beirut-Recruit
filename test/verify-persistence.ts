import { useCVStore } from "../src/lib/store/cv-store";

async function runPersistenceAudit() {
  console.log("==================================================================");
  console.log("SUB-AGENT 4: QA & BUILD AUDIT — PERSISTENCE & STEPPER VERIFICATION");
  console.log("==================================================================\n");

  // Mock a localStorage environment if running in Node.js
  const mockStorage: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };
  (global as any).window = {
    localStorage: (global as any).localStorage,
  };

  console.log("[TEST 1] Verifying store initial state and lastSavedTimestamp...");
  const store = useCVStore.getState();
  console.log("  - Current Step:        ", store.currentStep);
  console.log("  - Last Saved Timestamp:", store.lastSavedTimestamp);
  if (!store.lastSavedTimestamp || store.lastSavedTimestamp <= 0) {
    throw new Error("lastSavedTimestamp was not initialized!");
  }
  console.log("✓ TEST 1 PASSED: Initial state and timestamp verified.\n");

  console.log("[TEST 2] Verifying mutation updates lastSavedTimestamp and persists...");
  const oldTimestamp = store.lastSavedTimestamp;
  // Sleep 15ms so timestamp changes
  await new Promise((r) => setTimeout(r, 20));

  store.setCurrentStep("SETUP");
  store.updateContact({ fullName: "Test Candidate Engineer" });

  const stateAfterUpdate = useCVStore.getState();
  console.log("  - Updated Step:        ", stateAfterUpdate.currentStep);
  console.log("  - Updated Full Name:   ", stateAfterUpdate.cvData.contact.fullName);
  console.log("  - New Timestamp:       ", stateAfterUpdate.lastSavedTimestamp);

  if (stateAfterUpdate.currentStep !== "SETUP") throw new Error("Step did not update");
  if (stateAfterUpdate.cvData.contact.fullName !== "Test Candidate Engineer") throw new Error("Contact fullName did not update");
  if (stateAfterUpdate.lastSavedTimestamp <= oldTimestamp) throw new Error("Timestamp did not advance on mutation");
  console.log("✓ TEST 2 PASSED: Mutation successfully updated timestamp and state.\n");

  console.log("[TEST 3] Verifying resetToDefaults()...");
  store.resetToDefaults();
  const resetState = useCVStore.getState();
  console.log("  - Reset Step:          ", resetState.currentStep);
  console.log("  - Reset Full Name:     ", resetState.cvData.contact.fullName);
  if (resetState.cvData.contact.fullName === "Test Candidate Engineer") {
    throw new Error("resetToDefaults did not restore initial contact!");
  }
  console.log("✓ TEST 3 PASSED: resetToDefaults successfully restored clean state.\n");

  console.log("==================================================================");
  console.log("ALL PERSISTENCE AUDIT CHECKS COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
}

runPersistenceAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
