import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storage } from "../storage";

interface XmlDeviceModel {
  parentDevice: string;
  modelID: string;
  slug: string;
  imageUrl: string;
  name: string;
  brand: string;
  deeplink?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_XML_PATH = path.resolve(__dirname, "../data/device-models.xml");
const CATEGORY_SLUG = process.env.DEVICE_CATEGORY_SLUG ?? "smartphones";
const CATEGORY_NAME = process.env.DEVICE_CATEGORY_NAME ?? "Smartphones";
const IMAGE_EXTENSIONS = ["webp", "png", "jpeg", "jpg"];

function parseModelsXml(xml: string): XmlDeviceModel[] {
  const models: XmlDeviceModel[] = [];
  const modelRegex = /<model>([\s\S]*?)<\/model>/gi;
  let match: RegExpExecArray | null;

  const extractValue = (block: string, tag: string) => {
    const tagRegex = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, "i");
    const tagMatch = tagRegex.exec(block);
    return tagMatch ? tagMatch[1].trim() : undefined;
  };

  while ((match = modelRegex.exec(xml)) !== null) {
    const block = match[1];
    const parentDevice = extractValue(block, "parentDevice") ?? "";
    const modelID = extractValue(block, "modelID") ?? "";
    const slug = extractValue(block, "slug") ?? "";
    const imageUrl = extractValue(block, "imageUrl") ?? "";
    const name = extractValue(block, "name") ?? "";
    const brand = extractValue(block, "brand") ?? parentDevice;
    const deeplink = extractValue(block, "deeplink");

    if (!modelID || !slug || !imageUrl || !name) {
      console.warn(`Skipping model due to missing fields: ${JSON.stringify({ modelID, slug, name })}`);
      continue;
    }

    models.push({ parentDevice, modelID, slug, imageUrl, name, brand, deeplink });
  }

  return models;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function generateSku(brand: string, modelId: string): string {
  return `${brand}-${modelId}`.replace(/[^a-z0-9]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toUpperCase();
}

function formatBrand(brand: string): string {
  if (!brand) return brand;
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

function decodeXmlEntities(value?: string): string | undefined {
  return value?.replace(/&amp;/g, "&");
}

async function resolveImageUrl(baseUrl: string): Promise<string> {
  if (/\.(webp|png|jpe?g)$/i.test(baseUrl)) {
    return baseUrl;
  }

  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = `${baseUrl}.${ext}`;
    try {
      const response = await fetch(candidate, { method: "HEAD" });
      if (response.ok) {
        return candidate;
      }
    } catch (error) {
      console.warn(`Image check failed for ${candidate}: ${(error as Error).message}`);
    }
  }

  console.warn(`No image variant found for ${baseUrl}, using fallback URL.`);
  return baseUrl;
}

async function ensureCategory() {
  let category = await storage.getCategoryBySlug(CATEGORY_SLUG);
  if (!category) {
    category = await storage.createCategory({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
    });
    console.log(`Created category "${CATEGORY_NAME}" with slug "${CATEGORY_SLUG}".`);
  }
  return category;
}

async function importFromXml(xmlPath: string) {
  const xmlContent = await fs.readFile(xmlPath, "utf8");
  const models = parseModelsXml(xmlContent);

  if (models.length === 0) {
    console.warn("No models found in XML file.");
    return;
  }

  const category = await ensureCategory();
  let created = 0;
  let skipped = 0;

  for (const model of models) {
    const slug = slugify(`${model.brand || model.parentDevice}-${model.slug}`);
    const existing = await storage.getDeviceModelBySlug(slug);
    if (existing) {
      skipped += 1;
      continue;
    }

    const resolvedImageUrl = await resolveImageUrl(model.imageUrl);
    const description = model.deeplink
      ? `Sell deeplink: ${decodeXmlEntities(model.deeplink)}`
      : `Imported from XML feed (${path.basename(xmlPath)})`;

    await storage.createDeviceModel({
      brand: formatBrand(model.brand || model.parentDevice || ""),
      name: model.name.trim(),
      marketingName: model.name.trim(),
      sku: generateSku(model.brand || model.parentDevice, model.modelID),
      slug,
      categoryId: category.id,
      imageUrl: resolvedImageUrl,
      description,
      isActive: true,
    });

    created += 1;
  }

  console.log(`Device import complete. Created ${created} models, skipped ${skipped} existing models.`);
}

async function main() {
  const xmlPathArg = process.argv[2];
  const xmlPath = xmlPathArg ? path.resolve(process.cwd(), xmlPathArg) : DEFAULT_XML_PATH;

  try {
    await fs.access(xmlPath);
  } catch {
    console.error(`XML file not found at ${xmlPath}. Provide a path as an argument or add a file at the default location.`);
    process.exitCode = 1;
    return;
  }

  await importFromXml(xmlPath);
}

main().catch((error) => {
  console.error("Device import failed:", error);
  process.exitCode = 1;
});
