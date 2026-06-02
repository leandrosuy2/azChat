export const DEFAULT_PRODUCT_UNITS = [
  { key: "un", label: "Unidade" },
  { key: "m", label: "Metro" },
  { key: "m2", label: "Metro quadrado (m²)" },
  { key: "kg", label: "Quilograma (kg)" },
  { key: "L", label: "Litro" },
  { key: "h", label: "Hora" },
  { key: "srv", label: "Serviço" },
];

export const unitLabel = (key, customUnits = []) => {
  const preset = DEFAULT_PRODUCT_UNITS.find((u) => u.key === key);
  if (preset) return preset.label;
  const custom = customUnits.find(
    (u) => u.abbreviation === key || String(u.id) === String(key)
  );
  return custom?.name || key || "Unidade";
};

export const buildUnitOptions = (customUnits = []) => {
  const options = DEFAULT_PRODUCT_UNITS.map((u) => ({
    value: u.key,
    label: u.label,
  }));
  customUnits.forEach((u) => {
    options.push({
      value: u.abbreviation || String(u.id),
      label: u.name,
    });
  });
  return options;
};
