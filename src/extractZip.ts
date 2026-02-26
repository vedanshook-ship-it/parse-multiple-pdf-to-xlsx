import AdmZip from "adm-zip";

export function extractZip(assetPath: string) {
  try {
    const zip = new AdmZip(assetPath);
    const zipEntries = zip.getEntries();
    console.log(`Found ${zipEntries.length} items.`);
    zip.extractAllTo("./src/assets/Extracted");
  } catch (error) {
    console.error("Extract Zip Error: ", error);
  }
}