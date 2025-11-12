// schemas/index.js
const Joi = require("joi");

exports.tokenSchema = Joi.object({
  email: Joi.string().email().required(),
  schoolName: Joi.string().required(),
});

exports.schoolValidationSchema = Joi.object({
  name: Joi.string().max(255).required(),
  prefix: Joi.string()
    .pattern(/^[0-9]{4}$/)
      .messages({
      "string.pattern.base": "Prefix must be exactly 4 uppercase letters (A–Z).",
      "string.uppercase": "Prefix must be uppercase letters only.",
      "string.length": "Prefix must be exactly 4 characters.",
    })
    .optional(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().max(50).optional(),
  address: Joi.string().optional(),
});
