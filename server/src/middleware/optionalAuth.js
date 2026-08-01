import { requireAuth } from "./authenticate.js";

/**
 * Attaches req.user when the request carries a valid session, and continues
 * unchanged when it does not.
 *
 * Used by logout: clearing a stale or already-expired cookie must always
 * succeed, but when the session *is* valid we want to know who logged out so
 * the audit trail records it.
 */
export default function optionalAuth(req, res, next) {
  requireAuth(req, res, (error) => {
    if (error) {
      req.user = undefined;
    }
    next();
  });
}
