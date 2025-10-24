import fs from "fs";
import path from "path";

const ensureFile = (p, initial = "[]") => {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, initial);
};

export const resolveDataPaths = () => {
  const productsPath = process.env.PRODUCTS_DATA || path.resolve("data/products.json");
  const designPath = process.env.DESIGN_DATA || path.resolve("data/design.json");
  ensureFile(productsPath, "[]");
  ensureFile(designPath, "{}");
  return { productsPath, designPath };
};
