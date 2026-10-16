import { Response } from 'express';

/** Réponse Express simulée (status/json chaînables). */
export function mockRes(): Response & { status: jest.Mock; json: jest.Mock } {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

/** Enregistrement Sequelize simulé. */
export const record = (data: Record<string, unknown>) => ({
  get: jest.fn((arg?: unknown) => (typeof arg === 'string' ? data[arg] : { ...data })),
});

/** Laisse s'exécuter les promesses en attente (handlers asyncHandler). */
export const flush = () => new Promise(resolve => setImmediate(resolve));
