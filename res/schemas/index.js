// schemas/index.js
const Joi = require("joi");

exports.tokenSchema = Joi.object({
  email: Joi.string().email().required(),
  schoolName: Joi.string().required(),
});

exports.schoolValidationSchema = Joi.object({
  name: Joi.string().max(255).required(),
  prefix: Joi.string().max(3).required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().max(50).optional(),
  address: Joi.string().optional(),
});
