export const formatCurrencyCOP = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(safeValue));
};

export const formatSignedCurrencyCOP = (value: number) => {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrencyCOP(Math.abs(value))}`;
};

export const roleLabel = (role: string | null | undefined) => {
  if (role === "admin") return "Administrador";
  return "Usuario";
};

export const normalizeMoneyInput = (raw: string) => raw.replace(/\D/g, "");

export const formatMoneyInput = (raw: string) => {
  const digits = normalizeMoneyInput(raw);
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });
};

export const parseMoneyInput = (raw: string) => {
  const digits = normalizeMoneyInput(raw);
  return digits ? Number(digits) : 0;
};