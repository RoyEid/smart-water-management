/**
 * Query-string counterpart to validateRequest.
 *
 * Needed because every list endpoint takes pagination and filters through the
 * query string, and an unvalidated `limit` is how an API ends up loading a
 * whole collection into memory. The parsed result is stored on
 * `req.validatedQuery` rather than reassigning `req.query`, which is a getter
 * on Express 5 and cannot be overwritten.
 */
export default function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      req.validatedQuery = parsed;
      // Express 4 allows the assignment and downstream code reads req.query, so
      // keep them in sync where the platform permits it.
      try {
        req.query = parsed;
      } catch {
        // Express 5: req.query is read-only. req.validatedQuery is the source.
      }
      next();
    } catch (err) {
      if (err.name === "ZodError" || err.issues) {
        const formattedErrors = {};
        err.issues.forEach((issue) => {
          formattedErrors[issue.path.join(".")] = issue.message;
        });

        const validationError = new Error("Invalid query parameters");
        validationError.statusCode = 400;
        validationError.errors = formattedErrors;
        return next(validationError);
      }
      next(err);
    }
  };
}
