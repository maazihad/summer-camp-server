const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);


const port = process.env.PORT || 5999;


//======>>>>>>>>>>>>>>>Middleware<<<<<<<<<<<<<<<<<<<<<<<<<
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
      const userCollections = client.db('raosuDb').collection('users');
      const classesCollections = client.db("raosuDb").collection("classes");
      const paymentCollections = client.db("raosuDb").collection("payments");



      // ================>>>generate JWT<<<===================
      app.post('/jwt', (req, res) => {
         const email = req.body;
         const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7h' });
         // console.log(token);
         res.send({ token });
      });
      // ================>>> Admin Verify <<<===================
      const verifyAdmin = async (req, res, next) => {
         const email = req.decoded.email;
         const query = { email: email };
         const user = await userCollections.findOne(query);
         if (user?.role !== 'admin') {
            return res.status(403).send({ error: true, message: 'Access Deny' });
         }
         next();
      };

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


      // ================>>>Single Class<<<===================
      app.get('/class/:id', async (req, res) => {
         const id = req.params.id;
         const query = {
            _id: new ObjectId(id)
         };
         const result = await infoCollections.findOne(query);
         res.send(result);
      });





      //================payment intent stripe
      app.post("/create-payment-intent", verifyJWT, async (req, res) => {
         const { price } = req.body;
         const amount = parseInt(price * 100);
         const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: ["card"]
         });
         res.send({
            clientSecret: paymentIntent.client_secret,
         });
      });


      // app.get('/dashboard/paymentHistory', verifyJWT, (req, res) => {

      //    const {
      //       transactionId,
      //       totalPayment,
      //       paymentDate
      //    } = req.query;

      //    const filteredPaymentHistory = paymentHistoryData.filter(payment => {
      //       if (
      //          (!transactionId || payment.transactionId === Number(transactionId)) &&
      //          (!totalPayment || payment.totalPayment === Number(totalPayment)) &&
      //          (!paymentDate || payment.paymentDate === paymentDate)
      //       ) {
      //          return true;
      //       }
      //       return false;
      //    });

      //    res.json(filteredPaymentHistory);
      // });

      // app.get('/dashboard/payment-history', async (req, res) => {
      //    const email = req.query.email;
      //    if (!email) {
      //       res.send([]);
      //    }
      //    const query = {
      //       email: email
      //    };
      //    const result = await paymentCollections.find(query).toArray();
      //    res.send(result);
      // });



      app.get('/dashboard/payment-history', async (req, res) => {
         const email = req.query.email;
         if (!email) {
            res.status(400).send('Email is required');
            return;
         }
         const query = {
            email: email
         };
         try {
            const result = await paymentCollections.find(query).toArray();
            res.send(result);
         } catch (error) {
            res.status(500).send('Error retrieving payment history');
         }
      });

      // =================payment related api
      app.post('/payments', verifyJWT, async (req, res) => {
         const payment = req.body;
         const result = await paymentCollections.insertOne(payment);
         res.send({
            result
         });
      });





      // //=================single room details
      // app.get('/class/:email', verifyJWT, async (req, res) => {
      //    const email = req.params.email;
      //    const decodedEmail = req.decoded.email;
      //    if (decodedEmail !== email) {
      //       return res.status(403).send({ error: 1, message: "forbidden access" });
      //    };
      //    const query = { 'host.email': email };
      //    const result = await roomsCollection.find(query).toArray();
      //    res.send(result);
      // });
      /* 
         =====================================================
                        >>>Users API's<<<
         =====================================================
      */




      // //===============get user
      // app.get('/users/:email', async (req, res) => {
      //    const email = req.params.email;
      //    const query = { email: email };
      //    const result = await usersCollection.findOne(query);
      //    res.send(result);
      // });


      // ================>>>Get All Users<<<===================
      app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
         const result = await userCollections.find().toArray();
         res.send(result);
      });

      // save user route=====================================================
      app.put('/users/:email', async (req, res) => {
         const email = req.params.email;
         console.log(email);
         const user = req.body;
         const query = { email: email };
         const options = {
            upsert: true
         };
         const updateDoc = {
            $set: user
         };
         const result = await userCollections.updateOne(query, updateDoc, options);
         // console.log(result);
         res.send(result);
      });

      // ================>>>check is admin<<<===================
      app.get('/users/admin/:email', verifyJWT, async (req, res) => {
         const email = req.params.email;
         if (req.decoded.email !== email) {
            return res.send({ admin: false });
         }
         const query = { email: email };
         const user = await userCollections.findOne(query);
         const result = { admin: user?.role === 'admin' };
         res.send(result);
      });
      // // ================>>>Storing Users In Database<<<===================
      // app.post('/users', async (req, res) => {
      //    const user = req.body;
      //    const query = {
      //       email: user.email
      //    };
      //    const existingUser = await userCollections.findOne(query);
      //    if (existingUser) {
      //       return res.send({ message: 'user already exists' });
      //    }
      //    const result = await userCollections.insertOne(user);
      //    res.send(result);
      // });
      // ------------------------------------------------------------------------------------


      // app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      //    const email = req.params.email;

      //    if (req.decoded.email !== email) {
      //       return res.send({ admin: false });
      //    }

      //    const query = { email: email };
      //    const user = await usersCollection.findOne(query);
      //    const result = { admin: user?.role === 'admin' };
      //    res.send(result);
      // });

      app.patch('/users/admin/:id', async (req, res) => {
         const id = req.params.id;
         console.log(id);
         const filter = { _id: new ObjectId(id) };
         const updateDoc = {
            $set: {
               role: 'admin'
            },
         };
         const result = await usersCollection.updateOne(filter, updateDoc);
         res.send(result);
      });


      app.delete("/users/admin/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await userCollections.deleteOne(query);
         res.send(result);
      });





      app.get('/classes', verifyJWT, async (req, res) => {
         const email = req.query.email;
         if (!email) {
            res.send([]);
         }
         const decodedEmail = req.decoded.email;
         if (email !== decodedEmail) {
            return res.status(403).send({ error: true, message: 'Forbidden access' });
         }
         const query = { email: email };
         const result = await classesCollections.find(query).toArray();
         res.send(result);
      });


      app.post('/classes', async (req, res) => {
         const item = req.body;
         console.log(item);
         const result = await classesCollections.insertOne(item);
         console.log(result);
         res.send(result);
      });

      app.delete('/classes/:id', async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await classesCollections.deleteOne(query);
         res.send(result);
      });




      //====================

      // app.get('/order-stats', async (req, res) => {
      //    const pipeline = [
      //       {
      //          $lookup: {
      //             from: 'menu',
      //             localField: 'menuItems',
      //             foreignField: '_id',
      //             as: 'menuItemsData'
      //          }
      //       },
      //       {
      //          $unwind: '$menuItemsData'
      //       },
      //       {
      //          $group: {
      //             _id: '$menuItemsData.category',
      //             count: { $sum: 1 },
      //             total: { $sum: '$menuItemsData.price' }
      //          }
      //       },
      //       {
      //          $project: {
      //             category: '$_id',
      //             count: 1,
      //             total: { $round: ['$total', 2] },
      //             _id: 0
      //          }
      //       }
      //    ];
      //    const result = await paymentCollections.aggregate(pipeline).toArray();
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