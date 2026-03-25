const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const SSLCommerzPayment = require('sslcommerz-lts');
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


const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    });
};

async function run() {
  try {
    const db = client.db("Shopnest");
    const testimonialCollection = db.collection("testimonials");
    const blogCollection = db.collection("blogs");
    const productCollection = db.collection("products");
    const wishlistCollection = db.collection("wishlist");
    const cartCollection = db.collection("carts");
    const orderCollection = db.collection("orders");
    const userCollection = db.collection("users");

    const store_id = process.env.SSL_STORE_ID;
    const store_passwd = process.env.SSL_STORE_PASS;
    const is_live = false;

    // ----------------------------------------------ALL Routes------------------------------------------------
  
const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
    }
    next();
};

app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({ token });
});
 // admin route

 // check if admin
   app.get("/users/admin/:email", async (req, res) => {
    const email = req.params.email;
    const user = await userCollection.findOne({ email: email });
    let admin = false;
    if (user) {
        admin = user?.role === "admin"; 
    }
    res.send({ admin });
    });

    /// ADMIN CONTROLS ROUTES

    // control all user
app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
});

// Admin check so that can't delete himself
app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const requesterEmail = req.decoded.email; 
    const filter = { _id: new ObjectId(id) };
    const userToUpdate = await userCollection.findOne(filter);

    if (userToUpdate.email === requesterEmail) {
        return res.status(400).send({ message: "You cannot change your own role" });
    }
    const updateDoc = {
        $set: { role: "admin" },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
});

// product delete
app.delete("/products/:id", verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await productCollection.deleteOne(query);
    res.send(result);
});

// get all products with pagination
app.get("/admin/products", verifyToken, verifyAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    
    const cursor = productCollection.find();
    const total = await productCollection.countDocuments();
    const result = await cursor.skip(page * size).limit(size).toArray();
    
    res.send({ result, total });
});

// updating stock
app.patch("/admin/products/add-stock/:id", verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const { newQuantity } = req.body; 

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $inc: { quantity: parseInt(newQuantity) },
        $set: { stockStatus: "in-stock" } 
    };

    const result = await productCollection.updateOne(filter, updateDoc);
    res.send(result);
});

// post new products
app.post("/products", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const product = req.body;
        const result = await productCollection.insertOne(product);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error adding product", error });
    }
});


// Admin can see all orders with pagination
app.get("/admin/orders", verifyToken, verifyAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    
    const cursor = orderCollection.find().sort({ orderDate: -1 });
    const total = await orderCollection.countDocuments();
    const result = await cursor.skip(page * size).limit(size).toArray();
    
    res.send({ result, total });
});

app.patch("/orders/status-update/:id", verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: { status: status },
    };
    const result = await orderCollection.updateOne(filter, updateDoc);
    res.send(result);
});


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

    // Update or Create User info
app.put("/users/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email };
            const existingUser = await userCollection.findOne(query);
            
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...user,
                    role: existingUser?.role ? existingUser.role : 'user'
                },
            };
            const result = await userCollection.updateOne(query, updateDoc, options);
            res.send(result);
        });

// get user data
app.get("/users/:email", async (req, res) => {
    const email = req.params.email;
    const result = await userCollection.findOne({ email: email });
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
        const query = { 
          userEmail: item.userEmail, 
          productId: item.productId 
        };
        
        const existingItem = await cartCollection.findOne(query);

        if (existingItem) {
          const updateDoc = {
            $inc: { quantity: item.quantity || 1 }
          };
          const result = await cartCollection.updateOne(query, updateDoc);
          res.send(result);
        } else {
          const result = await cartCollection.insertOne(item);
          res.send(result);
        }
      } catch (error) {
        res.status(500).send({ message: "Error processing cart item", error });
      }
    });

    // 2. get cart of individual user mail
    app.get("/carts/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching cart items", error });
      }
    });

    // 3. delete item from cart
    app.delete("/carts/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await cartCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error deleting cart item", error });
      }
    });

    // 4. quantity plus minus in cart (Patch Route)
    app.patch("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const { action } = req.body;
      try {
        const query = { _id: new ObjectId(id) };
        const amount = action === 'increase' ? 1 : -1;
        
        const result = await cartCollection.updateOne(query, {
          $inc: { quantity: amount }
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error updating quantity", error });
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


/// Cart Clear:

app.delete("/carts/clear/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userEmail: email };
    const result = await cartCollection.deleteMany(query); 
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error clearing cart", error });
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
  try {
    const query = { _id: new ObjectId(id) };
    const result = await wishlistCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Invalid ID format" });
  }
});
//////////// Payment Initiate

app.post("/order", async (req, res) => {
    const order = req.body;
    const transactionId = new ObjectId().toString(); 

    const data = {
        total_amount: order.totalAmount,
        currency: 'BDT',
        tran_id: transactionId, 
        success_url: `http://localhost:5000/payment/success/${transactionId}`,
        fail_url: `http://localhost:5000/payment/fail/${transactionId}`,
        cancel_url: `http://localhost:5000/payment/cancel`,
        ipn_url: `http://localhost:5000/ipn`,
        shipping_method: 'Courier',
        product_name: 'Shopnest Products',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: `${order.firstName} ${order.lastName}`,
        cus_email: order.email,
        cus_add1: order.address,
        cus_city: order.area,
        cus_postcode: '4000',
        cus_country: 'Bangladesh',
        cus_phone: order.phone,
        ship_name: order.firstName,
        ship_add1: order.address,
        ship_city: order.area,
        ship_state: order.area,
        ship_postcode: '4000',
        ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then(apiResponse => {
        let GatewayPageURL = apiResponse.GatewayPageURL;
        
        // payment save in dB
        const finalOrder = {
            ...order,
            cartItems: order.cartItems,
            paidStatus: false,
            status: 'Pending', 
    orderDate: new Date(),
            transactionId,
        };
        orderCollection.insertOne(finalOrder);

        res.send({ url: GatewayPageURL });
    });
});

// 3. If Payment Success 
app.post("/payment/success/:tranId", async (req, res) => {
    try {
        const result = await orderCollection.updateOne(
            { transactionId: req.params.tranId },
            {
                $set: {
                    paidStatus: true,
                },
            }
        );
        res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`);
    } catch (error) {
        console.error(error);
        res.redirect(`http://localhost:5173/payment/fail`);
    }
});

app.post("/payment/fail/:tranId", async (req, res) => {
    const result = await orderCollection.deleteOne({ transactionId: req.params.tranId });
    res.redirect(`http://localhost:5173/payment/fail`);
});

// Order Tracking API

app.get("/orders/track/:tranId", async (req, res) => {
    const result = await orderCollection.findOne({ transactionId: req.params.tranId });
    if (!result) {
        return res.status(404).send({ message: "Order not found" });
    }
    res.send(result);
});


/// user seeing order from my-orders

app.get("/orders/user/:email", async (req, res) => {
    try {
        const email = req.params.email;
        const query = { email: email }; 
        const result = await orderCollection.find(query).sort({ orderDate: -1 }).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error fetching user orders", error });
    }
});

// usert canclelling orders

app.patch("/orders/cancel/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: {
            status: "Cancelled"
        },
    };
    const result = await orderCollection.updateOne(filter, updateDoc);
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
