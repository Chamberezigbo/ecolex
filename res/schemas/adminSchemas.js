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

exports.studentSchema = Joi.object({
  surname: Joi.string().max(100).required(),
  name: Joi.string().max(100).required(),
  otherNames: Joi.string().max(255).optional(),
  gender: Joi.string().valid("Male", "Female", "Other").required(),
  dateOfBirth: Joi.date().iso().required(),
  guardianName: Joi.string().max(255).optional(),
  guardianNumber: Joi.string().pattern(/^[0-9+\-\s]{7,20}$/).optional(), // allows phone numbers
  lifestyle: Joi.string().max(255).optional(),
  session: Joi.string().max(50).required(),

  // Associations
  // schoolId: Joi.number().integer().required(),
  campusId: Joi.number().integer().optional(),
  classId: Joi.number().integer().required(),

  // Optional contact info
  email: Joi.string().email().max(255).optional(),
  // phoneNumber: Joi.string().pattern(/^[0-9+\-\s]{7,20}$/).optional(),
});