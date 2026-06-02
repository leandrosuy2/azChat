export const fieldsFromCatalogProduct = (product) => {
  if (!product) return null;
  const categoryParts = [
    product.productCategory?.name,
    product.productSubcategory?.name,
    product.category,
  ].filter(Boolean);
  return {
    productId: product.id,
    code: product.code || String(product.id),
    description: product.description || product.name,
    unit: product.unit || "un",
    category: categoryParts.join(" / "),
    unitPrice: Number(product.price) || 0,
  };
};

export const serializeOrderItem = (it, index) => ({
  code: it.code || String(index + 1),
  description: (it.description || "").trim(),
  qty: Number(it.qty) || 0,
  unitPrice: Number(it.unitPrice) || 0,
  total: Number(it.total) || 0,
  productId: it.productId || undefined,
  unit: it.unit || undefined,
  category: it.category || undefined,
});
