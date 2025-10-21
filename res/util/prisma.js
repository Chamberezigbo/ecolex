const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Convert Date -> 'YYYY-MM-DD' for createdAt fields in all results
const toDateOnly = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);

const transformDates = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformDates);
  if (data && typeof data === "object") {
    const out = Array.isArray(data) ? [] : {};
    for (const [k, v] of Object.entries(data)) {
      if (k === "createdAt" && v instanceof Date) out[k] = toDateOnly(v);
      else out[k] = transformDates(v);
    }
    return out;
  }
  return data;
};

prisma.$use(async (params, next) => {
  const result = await next(params);
  return transformDates(result);
});

module.exports = prisma;
