const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

async function run() {
  try {
    const db = client.db("Shopnest");
    const testimonialCollection = db.collection("testimonials");
    const blogCollection = db.collection("blogs");
    const productCollection = db.collection("products");
    const wishlistCollection = db.collection("wishlist");
    const cartCollection = db.collection("carts");

    // ----------------------------------------------ALL Routes------------------------------------------------

    // GET Route of testimonials
    app.get("/testimonials", async (req, res) => {
      const cursor = testimonialCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get routes of blogs
    app.get("/blogs", async (req, res) => {
      const result = await client
        .db("Shopnest")
        .collection("blogs")
        .find()
        .toArray();
      res.send(result);
    });

    // Get single blog by ID
    app.get("/blogs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await blogCollection.findOne(query);
        if (!result) {
          return res.status(404).send({ message: "Blog not found" });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching blog details", error });
      }
    });

    // Newsletter msg

    app.post("/messages", async (req, res) => {
      const newMessage = req.body;
      const result = await client
        .db("Shopnest")
        .collection("messages")
        .insertOne(newMessage);
      res.send(result);
    });

    // all about products

    // getting products in the shop routes

    app.get("/products", async (req, res) => {
      try {
        const query = {};
        const cursor = productCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
      } catch (error) {
        res.status(500).send({ message: "Error fetching products", error });
      }
    });

    // Single Products API
    app.get("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Product not found", error });
      }
    });

    /// stock products state
    app.patch("/products/update-stock/:id", async (req, res) => {
      const { id } = req.params;
      const { orderQuantity } = req.body;

      try {
        // avaible stock
        const product = await productCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!product || product.quantity < orderQuantity) {
          return res.status(400).send({ message: "Insufficient stock!" });
        }

        // 2. Stock Update
        const result = await productCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $inc: { quantity: -orderQuantity },
            $set: {
              stockStatus:
                product.quantity - orderQuantity === 0
                  ? "out-of-stock"
                  : "in-stock",
            },
          },
        );

        res.send({ message: "Stock updated successfully!", result });
      } catch (error) {
        res.status(500).send(error);
      }
    });

    // carts

    app.post("/carts", async (req, res) => {
      const item = req.body;
      try {
        const result = await cartCollection.insertOne(item);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error adding to cart", error });
      }
    });

    // post product to cart

app.patch("/products/update-stock/:id", async (req, res) => {
  const { id } = req.params;
  const { orderQuantity } = req.body;

  try {
    const query = { _id: new ObjectId(id) };
    const product = await productCollection.findOne(query);

    if (!product) {
      return res.status(404).send({ message: "Product not found in store!" });
    }

    if (product.quantity < orderQuantity) {
      return res.status(400).send({ message: "Insufficient stock!" });
    }
  
  } catch (error) {
    res.status(500).send({ message: "Invalid ID format or server error" });
  }
});
    // get all wishlist
    app.get("/wishlist/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const page = parseInt(req.query.page) || 0;
        const size = parseInt(req.query.size) || 10;
        const totalCount = await wishlistCollection.countDocuments(query);
        const count = await wishlistCollection.countDocuments(query);
        const result = await wishlistCollection
          .find(query)
          .sort({ addedAt: -1 })
          .skip(page * size)
          .limit(size)
          .toArray();

        res.send({ result, count: totalCount });
      } catch (error) {
        res.status(500).send({ message: "Error fetching wishlist", error });
      }
    });

    // Wishlist saving

    app.post("/wishlist", async (req, res) => {
  const item = req.body;
  const alreadyExists = await wishlistCollection.findOne({
    userEmail: item.userEmail,
    productId: item.productId 
  });

  if (alreadyExists) {
    return res.status(400).send({ message: "Product already in wishlist!" });
  }

  const result = await wishlistCollection.insertOne(item);
  res.send(result);
});

    // Wishlist item delete route

    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // -----------------------------------------------ALL Routes------------------------------------------------
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ShopNest Server is Running...");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
