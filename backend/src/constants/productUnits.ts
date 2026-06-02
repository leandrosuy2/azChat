export const DEFAULT_PRODUCT_UNITS = [
  { key: "un", label: "Unidade" },
  { key: "m", label: "Metro" },
  { key: "m2", label: "Metro quadrado (m²)" },
  { key: "kg", label: "Quilograma (kg)" },
  { key: "L", label: "Litro" },
  { key: "h", label: "Hora" },
  { key: "srv", label: "Serviço" }
] as const;

export type DefaultProductUnitKey = (typeof DEFAULT_PRODUCT_UNITS)[number]["key"];

export const resolveUnitLabel = (unit: string | null | undefined): string => {
  const key = String(unit || "un").trim();
  const preset = DEFAULT_PRODUCT_UNITS.find((u) => u.key === key);
  return preset?.label || key;
};
