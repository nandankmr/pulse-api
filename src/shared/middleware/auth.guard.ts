import { Router } from 'express';
import { authenticate } from './auth.middleware';

/**
 * Creates an Express router pre-configured with the authentication middleware.
 * Use this helper to uniformly protect sensitive routes across modules.
 */
export function createProtectedRouter(): Router {
  const router = Router();
  router.use(authenticate);
  return router;
}

/**
 * Applies the authentication middleware to an existing router in-place.
 */
export function applyAuthGuard(router: Router): Router {
  router.use(authenticate);
  return router;
}

/**
 * Wraps a router path segment with authentication enforcement.
 */
export function protectRoutes(baseRouter: Router, path: string, router: Router): Router {
  baseRouter.use(path, authenticate, router);
  return baseRouter;
}
