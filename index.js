const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.obcasl9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    // collections---------

    const userCollection = client.db("assignment12DB").collection("users");
    const donorReqCollection = client.db("assignment12DB").collection("request");

    // jwt related api---------

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });




    // verfication middleware ----------


    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // registerd User----------

    //user post form register
    app.post("/allUsers", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    //user update profile from dashboard
    app.put("/allUsers", async (req, res) => {
      try {
        const body = req.body;
        if (!req.query.email) {
          return res.status(408).json({ error: "No email provided" });
        }

        const email = req.query.email;
        const filter = { email: email };
        const options = { upsert: true };

        const updateDoc = {
          $set: {
            name: body.name,
            imageUrl: body.imageUrl,
            upazila: body.upazila,
            district: body.district,
            BloodGroup: body.BloodGroup,
          },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.json(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // SingleUser

    app.get("/user",verifyToken, async (req, res) => {
      try {
        if (!req.query.email) {
          return res.status(400).json({ error: "No email provided" });
        }

        const email = req.query.email;
        const query = { email: email };
        const result = await userCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // donor request ------------
    app.post('/allRequest',async(req,res) => {
      const user = req.body;
      const result = await donorReqCollection.insertOne(user);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The project is running");
});

app.listen(port, () => {
  console.log(`this is running ${port}`);
});
