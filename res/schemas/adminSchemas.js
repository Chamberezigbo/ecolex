const Joi = require("joi");

exports.createAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  role: Joi.string().valid("super_admin", "school_admin").required(),
  schoolId: Joi.number().optional(),
  campusId: Joi.when("role", {
    is: "school_admin",
    then: Joi.number().required(),
    otherwise: Joi.forbidden(),
  }),
  uniqueKey: Joi.when("role", {
    is: "super_admin",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
});

exports.updateAdminSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid("super_admin", "school_admin").optional(),
  campusId: Joi.number().optional(),
  steps: Joi.number().optional(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
