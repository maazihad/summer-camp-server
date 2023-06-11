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



//======>>>>>>>>>>>>>>>Validate JWT<<<<<<<<<<<<<<<<<<<<<<<<<
const verifyJWT = (req, res, next) => {
   const authorization = req.headers.authorization;
   if (!authorization) {
      return res.status(403).send({ error: true, message: "Forbidden Access" });
   }
   const token = authorization.split(' ')[1];
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
         return res.status(401).send({ error: true, message: "Unauthorized Access" });
      }
      req.decoded = decoded;
      next();
   });
};

async function run() {
   try {
      // ================>>>Collections<<<===================
      const infoCollections = client.db('raosuDb').collection('allInfo');
      const sliderCollections = client.db('raosuDb').collection('bannerSlider');
      const allUserCollections = client.db('raosuDb').collection('allUsers');

      // ================>>>generate JWT<<<===================
      app.post('/jwt', (req, res) => {
         const email = req.body;
         const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15d' });
         // console.log(token);
         res.send({ token });
      });
      // ================>>>Admin Verify<<<===================
      // const verifyAdmin = async (req, res, next) => {
      //    const email = req.decoded.email;
      //    const query = { email: email };
      //    const user = await allUserCollections.findOne(query);
      //    if (user?.role !== 'admin') {
      //       return res.status(403).send({ error: true, message: 'Access Deny' });
      //    }
      //    next();
      // };

      app.get('/sliders', async (req, res) => {
         const result = await sliderCollections.find({}).toArray();
         res.send(result);
      });
      app.get('/allInfo', async (req, res) => {
         const result = await infoCollections.find({}).toArray();
         res.send(result);
      });

      // ================>>>Get Instructors<<<===================
      app.get('/instructors', async (req, res) => {
         const filter = {};
         const options = {
            projection: {
               instructorName: 1,
               instructorImage: 1,
               email: 1
            },
         };
         const result = await infoCollections.find(filter, options).toArray();
         res.send(result);
      });


      /* 
         =====================================================
                        >>>Users API's<<<
         =====================================================
      */

      // ================>>>Get All Users<<<===================
      app.get("/allUsers", verifyJWT, verifyAdmin, async (req, res) => {
         const result = await allUserCollections.find().toArray();
         res.send(result);
      });
      // ================>>>check is admin ?<<<===================
      app.get('/users/admin/:email', verifyJWT, async (req, res) => {
         const email = req.params.email;
         if (req.decoded.email !== email) {
            return res.send({ admin: false });
         }
         const query = { email: email };
         const user = await usersCollection.findOne(query);
         const result = { admin: user?.role === 'admin' };
         res.send(result);
      });
      // ================>>>Storing Users In Database<<<===================
      // app.post('/allUsers', async (req, res) => {
      //    const user = req.body;
      //    const query = {
      //       email: user.email
      //    };
      //    const existingUser = await allUserCollections.findOne(query);
      //    if (existingUser) {
      //       return res.send({ message: 'user already exists' });
      //    }
      //    const result = await allUserCollections.insertOne(user);
      //    res.send(result);
      // });


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
   res.send('Raosu summer camp photography School is running...............');
});

app.listen(port, () => {
   console.log(`Raosu summer camp photography school is running on ${port}`);
});