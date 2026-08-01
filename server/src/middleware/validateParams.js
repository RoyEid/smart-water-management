/**
 * Validates route parameters before they reach a controller.
 *
 * Matters most for Mongo id lookups: passing an arbitrary string to findById
 * throws a CastError that surfaces as a 500, when the honest answer is a 400
 * for a malformed id.
 */
export default function validateParams(schema) {
  return async (req, res, next) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (err) {
      if (err.name === "ZodError" || err.issues) {
        const formattedErrors = {};
        err.issues.forEach((issue) => {
          formattedErrors[issue.path.join(".")] = issue.message;
        });

        const validationError = new Error("Invalid request parameters");
        validationError.statusCode = 400;
        validationError.errors = formattedErrors;
        return next(validationError);
      }
      next(err);
    }
  };
}
