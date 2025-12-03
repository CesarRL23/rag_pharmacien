// src/models/Document.js
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

class Document {
  constructor() {
    this.collectionName = 'documents';
  }

  getCollection() {
    const db = getDB();
    return db.collection(this.collectionName);
  }

  static getValidationSchema() {
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: ['titulo', 'contenido'],
        properties: {
          titulo: { bsonType: 'string', description: 'Título del documento - requerido' },
          contenido: { bsonType: 'string', description: 'Contenido del documento - requerido' },
          tipo: { bsonType: 'string', description: 'Tipo de documento' },
          idioma: { bsonType: 'string', description: 'Idioma del documento' },
          fecha: { bsonType: 'date', description: 'Fecha del documento' },
          tags: { bsonType: 'array', items: { bsonType: 'string' }, description: 'Etiquetas del documento' },
          metadata: { bsonType: 'object', description: 'Metadata adicional' },
          created_at: { bsonType: 'date' },
          updated_at: { bsonType: 'date' }
        }
      }
    };
  }

  async create(docData) {
    const collection = this.getCollection();
    const doc = {
      ...docData,
      fecha: new Date(docData.fecha || Date.now()),
      created_at: new Date(),
      updated_at: new Date()
    };
    const result = await collection.insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  async findById(id) {
    const collection = this.getCollection();
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  async findMany(query = {}, options = {}) {
    const collection = this.getCollection();
    const { limit = 10, skip = 0, sort = { fecha: -1 } } = options;
    return await collection.find(query).sort(sort).limit(limit).skip(skip).toArray();
  }

  async update(id, updateData) {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    return result.value;
  }

  async delete(id) {
    const collection = this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async count(query = {}) {
    const collection = this.getCollection();
    return await collection.countDocuments(query);
  }
}

const documentInstance = new Document();
documentInstance.getValidationSchema = Document.getValidationSchema;
module.exports = documentInstance;
