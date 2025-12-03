const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

class Embedding {
  constructor() {
    this.collectionName = 'embeddings';
  }

  getCollection() {
    const db = getDB();
    return db.collection(this.collectionName);
  }

  async create(data) {
    const collection = this.getCollection();
    const doc = {
      ...data,
      fecha: new Date(),
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

module.exports = new Embedding();
