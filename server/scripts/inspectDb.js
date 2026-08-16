import mongoose from "mongoose";

async function inspect() {
  try {
    const conn = await mongoose.connect("mongodb://127.0.0.1:27017/smart-water-management", {
      serverSelectionTimeoutMS: 5000,
    });
    const db = conn.connection.db;

    console.log("=== 1. SENSORREADINGS INSPECTION ===");
    const srCol = db.collection("sensorreadings");
    const srCount = await srCol.countDocuments();
    console.log("Total documents in sensorreadings:", srCount);

    if (srCount > 0) {
      const srOldest = await srCol.find().sort({ receivedAt: 1, createdAt: 1 }).limit(1).toArray();
      const srNewest = await srCol.find().sort({ receivedAt: -1, createdAt: -1 }).limit(1).toArray();
      console.log("Oldest document:", srOldest[0]?.receivedAt || srOldest[0]?.createdAt);
      console.log("Newest document:", srNewest[0]?.receivedAt || srNewest[0]?.createdAt);
      const srSample = await srCol.findOne();
      console.log("Sample keys:", Object.keys(srSample));
      console.log("Sample document:", JSON.stringify(srSample, null, 2));
    }

    console.log("\n=== 2. ULTRASONICREADINGS INSPECTION ===");
    const urCol = db.collection("ultrasonicreadings");
    const urCount = await urCol.countDocuments();
    console.log("Total documents in ultrasonicreadings:", urCount);

    const obsoleteFields = [
      "flowRateLMin",
      "flowRate",
      "flowStatus",
      "sessionVolumeLiters",
      "totalTransferredLitres",
      "totalTransferredLiters",
      "waterTransferred",
    ];

    for (const field of obsoleteFields) {
      const count = await urCol.countDocuments({ [field]: { $exists: true } });
      console.log(`Documents with field "${field}":`, count);
    }

    const anyObsoleteQuery = {
      $or: obsoleteFields.map((f) => ({ [f]: { $exists: true } })),
    };
    const totalWithAnyObsolete = await urCol.countDocuments(anyObsoleteQuery);
    console.log("\nTotal documents in ultrasonicreadings with ANY obsolete flow field:", totalWithAnyObsolete);

    if (totalWithAnyObsolete > 0) {
      const sampleObsolete = await urCol.findOne(anyObsoleteQuery);
      console.log("\nSample document with obsolete fields:");
      console.log(JSON.stringify(sampleObsolete, null, 2));
    }

    const latestDoc = await urCol.find().sort({ receivedAt: -1 }).limit(1).toArray();
    console.log("\nLatest document shape:");
    console.log(JSON.stringify(latestDoc[0], null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Inspection error:", err);
  }
}

inspect();
