import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Paste your actual Atlas connection string here
const MONGO_URI = 'mongodb://realmechristina_db_user:christina@ac-ksqflw3-shard-00-00.4z1yvoy.mongodb.net:27017,ac-ksqflw3-shard-00-01.4z1yvoy.mongodb.net:27017,ac-ksqflw3-shard-00-02.4z1yvoy.mongodb.net:27017/examDB?ssl=true&replicaSet=atlas-8l5nad-shard-0&authSource=admin';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch((err) => console.log('❌ Database connection error:', err));

app.get('/', (req, res) => {
  res.send('Server is running smoothly!');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});