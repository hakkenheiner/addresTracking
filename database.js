
const MongoClient = require('mongodb').MongoClient;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let watchedAddresses = {};
let db;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db('AddressTracking');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

async function addWatchedAddress(userId, address, nickname) {
    // Rechercher l'entrée existante pour cet userId
    const existingEntry = await db.collection('watchedAddresses').findOne({ [userId]: { $exists: true } });
  
    if (existingEntry) {
      // Si l'entrée existe déjà, ajouter ou mettre à jour l'adresse et le surnom
      existingEntry[userId][nickname] = address;
      await db.collection('watchedAddresses').updateOne({ _id: existingEntry._id }, { $set: existingEntry });
    } else {
      // Si l'entrée n'existe pas, créer une nouvelle entrée
      const userObject = {
        [userId]: {
          [nickname]: address,
        },
      };
      await db.collection('watchedAddresses').insertOne(userObject);
    }
}

async function removeWatchedAddress(userId, nickname) {
    await db.collection('watchedAddresses').updateOne(
      { [userId]: { $exists: true } },
      { $unset: { [`${userId}.${nickname}`]: "" } }
    );
}

async function getWatchedAddresses(userId) {
  return await db.collection('watchedAddresses').find({ userId }).toArray();
}

async function loadWatchedAddresses() {
    try {
      const addresses = await getWatchedAddresses();
      watchedAddresses = addresses.reduce((acc, entry) => {
        // Obtenir l'userId et les adresses associées de l'entrée
        const [userId, userAddresses] = Object.entries(entry)[0];
        if (!acc[userId]) {
          acc[userId] = [];
        }
        // Obtenir les surnoms et les adresses à partir de userAddresses et les ajouter à acc[userId]
        for (const [nickname, address] of Object.entries(userAddresses)) {
          acc[userId].push({
            address: address,
            nickname: nickname,
          });
        }
        return acc;
      }, {});
      return watchedAddresses
    } catch (error) {
      console.error('Error loading watched addresses from database:', error);
    }
}
  
module.exports = {
  connectToDatabase,
  addWatchedAddress,
  removeWatchedAddress,
  loadWatchedAddresses
};
