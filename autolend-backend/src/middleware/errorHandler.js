export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = { message, statusCode: 404, code: 'RESOURCE_NOT_FOUND' };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0];
    const duplicateValue = duplicateField ? err.keyValue?.[duplicateField] : undefined;
    const message = duplicateField
      ? `Duplicate value for ${duplicateField}: ${duplicateValue}`
      : 'Duplicate field value entered';
    error = { message, statusCode: 409, code: 'DUPLICATE_FIELD' };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400, code: 'VALIDATION_ERROR' };
  }

  // Bitcoin verification/service errors
  if (err.name === 'BitcoinVerificationError') {
    error = {
      message: err.message,
      statusCode: err.statusCode || 400,
      code: err.code || 'BITCOIN_VERIFICATION_FAILED'
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    code: error.code || 'SERVER_ERROR'
  });
};
