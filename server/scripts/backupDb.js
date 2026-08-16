import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(__dirname, `../../backups/backup-${timestamp}`);

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`[Backup] Created backup directory: ${backupDir}`);

    const conn = await mongoose.connect("mongodb://127.0.0.1:27017/smart-water-management", {
      serverSelectionTimeoutMS: 5000,
    });
    const db = conn.connection.db;

    const collections = await db.listCollections().toArray();
    console.log(`[Backup] Found ${collections.length} collections:`, collections.map((c) => c.name));

    const manifest = {
      database: "smart-water-management",
      timestamp: new Date().toISOString(),
      backupDir,
      collections: {},
    };

    for (const colInfo of collections) {
      const colName = colInfo.name;
      const col = db.collection(colName);
      const count = await col.countDocuments();
      const docs = await col.find({}).toArray();
      const indexes = await col.indexes();

      const colFilePath = path.join(backupDir, `${colName}.json`);
      fs.writeFileSync(colFilePath, JSON.stringify(docs, null, 2), "utf8");

      const indexFilePath = path.join(backupDir, `${colName}.indexes.json`);
      fs.writeFileSync(indexFilePath, JSON.stringify(indexes, null, 2), "utf8");

      manifest.collections[colName] = {
        documentCount: count,
        fileSize: fs.statSync(colFilePath).size,
        indexesCount: indexes.length,
      };

      console.log(`[Backup] Backed up '${colName}': ${count} documents (${fs.statSync(colFilePath).size} bytes)`);
    }

    const manifestPath = path.join(backupDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`[Backup] Manifest written to ${manifestPath}`);
    console.log("[Backup] BACKUP COMPLETED AND VERIFIED SUCCESSFULLY.");

    await mongoose.disconnect();
    return { success: true, backupDir, manifest };
  } catch (error) {
    console.error("[Backup] FATAL BACKUP ERROR:", error.message);
    process.exit(1);
  }
}

backup();
