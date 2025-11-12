const Joi = require("joi");

const classSchema = Joi.object({
  name: Joi.string().max(255).required(),
});

const campusSchema = Joi.object({
  name: Joi.string().max(255).required(),
  address: Joi.string().optional(),
  phoneNumber: Joi.string().max(50).optional(),
  email: Joi.string().email().max(255).optional(),
});

const continuousAssessmentSchema = Joi.array().items(
  Joi.object({
    class_id: Joi.number().required(),
    name: Joi.string().max(50).required(),
    max_score: Joi.number().integer().positive().required(),
  })
);

const examSchema = Joi.object({
  class_id: Joi.number().required(),
  name: Joi.string().max(50).required(),
  max_score: Joi.number().required(),
});

const requestSchema = Joi.object({
  assessments: continuousAssessmentSchema.required(),
  exam: examSchema.optional(),
});

module.exports = {
  classSchema,
  campusSchema,
  continuousAssessmentSchema,
  examSchema,
  requestSchema,
};
