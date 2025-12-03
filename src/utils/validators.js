const Joi = require('joi');

const searchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500),
  filters: Joi.object({
    tipo: Joi.string().valid('medicamento', 'procedimiento', 'guia', 'articulo', 'otro'),
    idioma: Joi.string().length(2),
    tags: Joi.array().items(Joi.string()),
    fechaDesde: Joi.date().iso(),
    fechaHasta: Joi.date().iso()
  }).optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
  hybrid: Joi.boolean().default(false)
});

const ragSchema = Joi.object({
  pregunta: Joi.string().required().min(5).max(1000),
  contexto_adicional: Joi.string().max(2000).allow('').default(''),
  max_contexto: Joi.number().integer().min(1).max(10).default(5),
  filters: Joi.object({
    tipo: Joi.string().valid('medicamento', 'procedimiento', 'guia', 'articulo', 'otro'),
    idioma: Joi.string().length(2)
  }).optional(),
  temperature: Joi.number().min(0).max(2).default(0.7)
});

const multimodalSchema = Joi.object({
  query: Joi.string().required().min(1).max(500),
  tipo: Joi.string().valid('text-to-image', 'image-to-image').default('text-to-image'),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { valid: false, errors, value: null };
  }

  return { valid: true, errors: null, value };
}

module.exports = {
  searchSchema,
  ragSchema,
  multimodalSchema,
  validate
};