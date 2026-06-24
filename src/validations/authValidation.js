const { body, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array(),
    });
  };
};

const registerValidation = validate([
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('openingBalance')
    .optional()
    .isNumeric()
    .withMessage('Opening balance must be a number')
    .custom((value) => value >= 0)
    .withMessage('Opening balance cannot be negative'),
]);

const loginValidation = validate([
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
]);

module.exports = {
  registerValidation,
  loginValidation,
};
