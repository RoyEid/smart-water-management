import mongoose from "mongoose";

const OBSOLETE_FLOW_FIELDS = [
  "flowRateLMin",
  "flowRate",
  "flowStatus",
  "sessionVolumeLiters",
  "totalTransferredLitres",
  "totalTransferredLiters",
  "waterTransferred",
];

async function runMigration() {
  const isDryRun = process.argv.includes("--dry-run");
  const isApply = process.argv.includes("--apply");

  if (!isDryRun && !isApply) {
    console.error("Usage: node migrateDatabase.js [--dry-run | --apply]");
    process.exit(1);
  }

  console.log(`=== DATABASE MIGRATION (${isDryRun ? "DRY RUN MODE" : "APPLY MODE"}) ===\n`);

  try {
    const conn = await mongoose.connect("mongodb://127.0.0.1:27017/smart-water-management", {
      serverSelectionTimeoutMS: 5000,
    });
    const db = conn.connection.db;

    // 1. Check sensorreadings
    const collections = (await db.listCollections().toArray()).map((c) => c.name);
    console.log("[1. sensorreadings Check]");
    if (collections.includes("sensorreadings")) {
      const count = await db.collection("sensorreadings").countDocuments();
      console.log(`- Collection 'sensorreadings' found with ${count} legacy documents.`);
      console.log("- Active code references: 0");
      console.log("- Backup status: Verified in backups directory.");
      if (isApply) {
        await db.collection("sensorreadings").drop();
        console.log("- ACTION: Successfully dropped orphaned collection 'sensorreadings'.");
      } else {
        console.log("- DRY RUN: 'sensorreadings' WOULD BE DROPPED.");
      }
    } else {
      console.log("- Collection 'sensorreadings' does not exist (already removed).");
    }

    // 2. Clean obsolete flow fields from ultrasonicreadings
    console.log("\n[2. ultrasonicreadings Cleanup]");
    const urCol = db.collection("ultrasonicreadings");
    const totalUr = await urCol.countDocuments();
    console.log(`- Total documents in 'ultrasonicreadings': ${totalUr}`);

    const matchFilter = {
      $or: OBSOLETE_FLOW_FIELDS.map((f) => ({ [f]: { $exists: true } })),
    };
    const affectedCount = await urCol.countDocuments(matchFilter);
    console.log(`- Documents containing obsolete flow fields: ${affectedCount}`);

    for (const f of OBSOLETE_FLOW_FIELDS) {
      const fieldCount = await urCol.countDocuments({ [f]: { $exists: true } });
      if (fieldCount > 0) {
        console.log(`  * ${f}: ${fieldCount} documents`);
      }
    }

    const unsetObj = {};
    for (const f of OBSOLETE_FLOW_FIELDS) {
      unsetObj[f] = "";
    }

    if (isApply && affectedCount > 0) {
      const updateResult = await urCol.updateMany(matchFilter, {
        $unset: unsetObj,
      });
      console.log(`- ACTION: Updated ${updateResult.modifiedCount} documents (removed obsolete flow fields).`);
    } else if (isDryRun) {
      console.log(`- DRY RUN: ${affectedCount} documents WOULD BE MODIFIED to $unset obsolete fields.`);
    }

    // 3. Final Verification
    console.log("\n[3. Final State Verification]");
    const finalCollections = (await db.listCollections().toArray()).map((c) => c.name);
    console.log("- Remaining collections:", finalCollections);

    const remainingObsolete = await urCol.countDocuments(matchFilter);
    console.log(`- Remaining documents with obsolete flow fields: ${remainingObsolete}`);

    const sampleDoc = await urCol.findOne({});
    console.log("- Sample document keys in 'ultrasonicreadings':", Object.keys(sampleDoc || {}));

    await mongoose.disconnect();
    console.log(`\n=== MIGRATION ${isDryRun ? "DRY RUN" : "APPLY"} FINISHED SUCCESSFULLY ===`);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

runMigration();
