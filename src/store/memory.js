// Simple in-memory store for unified server (dev only)
export const memory = {
  agents: [],
  sales: [],
  refStats: { total: 0, byCode: {} },
  orders: [],
  commissionsByAgent: {},
};
