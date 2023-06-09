const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5999;

// middleware
const corsOptions = {
   origin: '*',
   credentials: true,
   optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xu5udz0.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

async function run() {
   try {
      const usersCollection = client.db('roosuDb').collection('users');

      // Send a ping to confirm a successful connection
      await client.db('admin').command({ ping: 1 });
      console.log(
         'Pinged your deployment. You successfully connected to MongoDB!'
      );
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);

app.get('/', (req, res) => {
   res.send('AirCNC Server is running..');
});

app.listen(port, () => {
   console.log(`AirCNC is running on port ${port}`);
});