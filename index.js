const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;


// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Middleware
app.use(cors());
app.use(express.json());







async function run() {
  try {
   
    const db = client.db("Shopnest"); 
    const testimonialCollection = db.collection("testimonials"); 

    // ----------------------------------------------ALL Routes------------------------------------------------

    // GET Route
    app.get('/testimonials', async (req, res) => {
      const cursor = testimonialCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });


    // -----------------------------------------------ALL Routes------------------------------------------------

  } finally {
    
  }
}
run().catch(console.dir);

























app.get('/', (req, res) => {
  res.send('ShopNest Server is Running...');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});


