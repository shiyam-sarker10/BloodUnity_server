const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const BlogCollection = client.db("assignment12DB").collection("Blogs");
    const donorReqCollection = client
      .db("assignment12DB")
      .collection("request");

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

    // use verify donor after verifyToken
    const verifyDonor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "donor";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // payment intent 
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log("amount", amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // registerd User----------

    //user post form register
    app.post("/allUsers", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/allUsers", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // block make admin , make volunteer unblock  patch allUsers

    app.patch("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const body = req.body;
        if (!req.query.id) {
          return res.status(400).json({ error: "No ID provided" });
        }

        const id = req.query.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };

        const result = await userCollection.updateOne(query, {
          $set: body,
        });
        res.json(result);
      } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //user update profile from dashboard
    app.put("/allUsers", async (req, res) => {
      try {
        const { name, imageUrl, upazila, district, BloodGroup } = req.body;
        if (!req.query.email) {
          return res.status(408).json({ error: "No email provided" });
        }

        const email = req.query.email;
        const filter = { email: email };

        const query = {};

        if (name) query.name = name;
        if (imageUrl) query.imageUrl = imageUrl;
        if (upazila) query.upazila = upazila;
        if (district) query.district = district;
        if (imageUrl) query.BloodGroup = BloodGroup;

        const updateDoc = {
          $set: query,
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.json(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // SingleUser

    app.get("/user", verifyToken, async (req, res) => {
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

    //  search single user

    app.get("/searchUser", async (req, res) => {
      const upazila = req.query.upazila;
      const district = req.query.district;
      const bloodGroup = req.query.bloodGroup;

      console.log("Received Query Parameters:", {
        upazila,
        district,
        bloodGroup,
      });

      const query = {};
      if (district) query.district = district;
      if (upazila) query.upazila = upazila;
      if (bloodGroup) query.BloodGroup = bloodGroup;

      console.log("Constructed Query:", query);

      try {
        const result = await userCollection.find(query).toArray();
        console.log("Query Result:", result);
        res.send(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // donor request ------------
    app.post("/allRequest", async (req, res) => {
      const user = req.body;
      const result = await donorReqCollection.insertOne(user);
      res.send(result);
    });

    // golbal req

    app.get("/globalReq", verifyToken, verifyAdmin, async (req, res) => {
      const result = await donorReqCollection.find().toArray();
      res.send(result);
    });

    // allReq  get

    app.get("/allRequest", async (req, res) => {
      try {
        if (!req.query.email) {
          return res.status(400).json({ error: "No email provided" });
        }

        const email = req.query.email;
        const query = { email: email };
        const result = await donorReqCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // allPendingReq  get
    app.get("/allPendingReq", async (req, res) => {
      try {
        if (!req.query.workStatus) {
          return res.status(400).json({ error: "No email provided" });
        }

        const status = req.query.workStatus;
        const query = { workStatus: status };
        const result = await donorReqCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //  SingleDonorReq

    app.get("/allRequest", verifyToken, async (req, res) => {
      try {
        if (!req.query.email) {
          return res.status(400).json({ error: "No email provided" });
        }

        const email = req.query.email;
        const query = { email: email };
        const result = await donorReqCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    // edit single req

    const { ObjectId } = require("mongodb");

    app.put("/allRequest", async (req, res) => {
      try {
        const body = req.body;
        if (!req.query.id) {
          return res.status(408).json({ error: "No ID provided" });
        }

        const id = req.query.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };

        const updateDoc = {
          $set: {
            donationTime: body.donationTime,
            upazila: body.upazila,
            district: body.district,
            donationDate: body.donationDate,
            fullAddress: body.fullAddress,
            hospitalName: body.hospitalName,
            recipientName: body.recipientName,
          },
        };

        const result = await donorReqCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.json(result);
      } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // delete single Req
    app.delete("/allRequest", async (req, res) => {
      try {
        const body = req.body;
        if (!req.query.id) {
          return res.status(408).json({ error: "No ID provided" });
        }

        const id = req.query.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };

        const options = { upsert: true };
        const updateDoc = {
          $set: {
            workStatus: body.workStatus,
          },
        };
        const result = await donorReqCollection.updateOne(
          query,
          updateDoc,
          options
        );
        res.json(result);
      } catch (error) {
        console.error("Error Delete request:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // donor update working status

    app.patch("/allRequest", async (req, res) => {
      try {
        const body = req.body;
        if (!req.query.id) {
          return res.status(400).json({ error: "No ID provided" });
        }

        const id = req.query.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };

        const result = await donorReqCollection.updateOne(query, {
          $set: body,
        });
        res.json(result);
      } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // donate inprogress working status
    app.patch("/allReqDonate", async (req, res) => {
      try {
        const body = req.body;
        if (!req.query.id) {
          return res.status(400).json({ error: "No ID provided" });
        }

        const id = req.query.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };

        const result = await donorReqCollection.updateOne(query, {
          $set: body,
        });
        res.json(result);
      } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //  all blogs creating  -- post
    app.post("/allBlogs", async (req, res) => {
      const Blog = req.body;
      const result = await BlogCollection.insertOne(Blog);
      res.send(result);
    });

    // all blogs get
    app.get("/allBlogs", async (req, res) => {
      const result = await BlogCollection.find().toArray();
      res.send(result);
    });

    // unPublish publish patch for admin content management
    app.patch("/allBlogs", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const body = req.body;
        if (!req.query.id) {
          return res.status(400).json({ error: "No ID provided" });
        }

        const id = req.query.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };

        const result = await BlogCollection.updateOne(query, {
          $set: body,
        });
        res.json(result);
      } catch (error) {
        console.error("Error Patching request:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

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
