const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

class Image {
  constructor() {
    this.collectionName = 'images';
  }

  getCollection() {
    const db = getDB();
    return db.collection(this.collectionName);
  }

  static getValidationSchema() {
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: ['url', 'titulo'],
        properties: {
          url: {
            bsonType: 'string',
            description: 'URL de la imagen - requerido'
          },
          titulo: {
            bsonType: 'string',
            description: 'Título de la imagen - requerido'
          },
          descripcion: {
            bsonType: 'string',
            description: 'Descripción de la imagen'
          },
          tipo: {
            bsonType: 'string',
            description: 'Tipo de imagen'
          },
          metadata: {
            bsonType: 'object',
            description: 'Metadata adicional'
          },
          fecha: {
            bsonType: 'date',
            description: 'Fecha de la imagen'
          }
        }
      }
    };
  }

  async create(imageData) {
    const collection = this.getCollection();
    const image = {
      ...imageData,
      fecha: new Date(imageData.fecha || Date.now()),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await collection.insertOne(image);
    return { _id: result.insertedId, ...image };
  }

  async findById(id) {
    const collection = this.getCollection();
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  async findMany(query = {}, options = {}) {
    const collection = this.getCollection();
    const { limit = 10, skip = 0, sort = { fecha: -1 } } = options;
    
    return await collection
      .find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async update(id, updateData) {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updateData, 
          updated_at: new Date() 
        } 
      },
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

module.exports = new Image();