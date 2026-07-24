export default function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      // parseAsync allows async custom Zod validations if needed in the future
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err.name === "ZodError" || err.issues) {
        const formattedErrors = {};
        
        err.issues.forEach((issue) => {
          // Join path arrays for nested fields, or just use the first field path
          const path = issue.path.join(".");
          formattedErrors[path] = issue.message;
        });

        const validationError = new Error("Validation failed");
        validationError.statusCode = 400;
        validationError.errors = formattedErrors;
        return next(validationError);
      }
      next(err);
    }
  };
}
