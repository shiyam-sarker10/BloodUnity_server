const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();


// middleware 
app.use(cors())
app.use(express.json())




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



    // collections

    const userCollection = client.db("assignment12DB").collection("users");



    // registerd User

    
    app.post("/allUsers", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
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