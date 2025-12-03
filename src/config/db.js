// src/config/db.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

let client;
let db;

const connectDB = async () => {
  if (db) return db; // ya conectado

  try {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME);
    console.log('✅ MongoDB conectado correctamente');
    return db;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
};

const getDB = () => {
  if (!db) throw new Error('La base de datos no está conectada. Llama a connectDB() primero.');
  return db;
};

const closeDB = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ Conexión a MongoDB cerrada');
  }
};

module.exports = { connectDB, getDB, closeDB };