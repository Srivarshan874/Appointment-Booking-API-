import { ApiError } from "../utils/ApiError.js";

export function validateRequest(schema, property = "body") {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      convert: true,
      stripUnknown: false
    });
    if (error) {
      const details = error.details.map((item) => ({
        field: item.path.join("."),
        message: item.message.replace(/\"/g, "")
      }));
      return next(new ApiError(400, "Validation failed", details));
    }
    if (property === "query") {
      req.validatedQuery = value;
    } else {
      req[property] = value;
    }
    next();
  };
}
