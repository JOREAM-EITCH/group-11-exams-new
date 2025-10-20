// Import dependencies
const express = require("express");
const dotenv = require("dotenv");
const db = require("./db.js"); // SQLite database connection

// Load environment variables from .env file
dotenv.config();

// Set port from env or fallback
const PORT = process.env.PORT || 5000;

// Create the Express server
const app = express();

// -------------------- MIDDLEWARE --------------------
// Parse URL-encoded bodies (from forms, etc.)
app.use(express.urlencoded({ extended: true }));
// Parse JSON request bodies
app.use(express.json());
// Set access control header and handle preflight
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    // Advertise allowed methods so browser preflight can succeed
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    // If this is a preflight request, respond early
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
});

// -------------------- ROUTES --------------------

/**
 * Example statistics endpoint
 * Returns simple metrics as JSON
 */
app.get("/statistics", (req, res) => {
  res.json({
    users: 46,
    products: 123,
    sales: 67,
    profit: 23000,
  });
});

/**
 * Example chart data for sales
 * Returns XY values for plotting
 */
app.get("/sales", (req, res) => {
  res.json([
    { x: 50, y: 7 },
    { x: 60, y: 8 },
    { x: 70, y: 8 },
    { x: 80, y: 9 },
    { x: 90, y: 9 },
    { x: 100, y: 9 },
    { x: 110, y: 10 },
    { x: 120, y: 11 },
    { x: 130, y: 14 },
    { x: 140, y: 14 },
    { x: 150, y: 15 },
  ]);
});

/**
 * Visitors endpoint
 * Returns daily visitor counts
 */
app.get("/visitors", (req, res) => {
  res.json({
    day: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    count: [3, 6, 10, 2, 32, 19, 9, 8, 16, 7],
  });
});

/**
 * GET /products
 * Returns all products from the database
 */
app.get("/products", (req, res) => {
  const products = db.prepare("SELECT * FROM products").all();
  res.json(products);
});

/**
 * GET /products/:id
 * Returns a single product by ID
 */
app.get("/products/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid product id" });
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

/**
 * POST /products
 * Adds a new product record to the database
 */
app.post("/products", (req, res) => {
  try {
    const insert = db.prepare(
      "INSERT INTO products (name,price,description,quantity) values(?,?,?,?)"
    );
    const { name, price, description, quantity } = req.body;

    const p = name?.trim();
    if (!p || p.length < 1) return res.status(400).json({ error: "Name is required" });

    const pr = parseFloat(price);
    const q = parseInt(quantity, 10);
    if (isNaN(pr) || isNaN(q)) return res.status(400).json({ error: "Price and quantity must be numbers" });

    // Insert into DB
    const result = insert.run(p, pr, description || "", q);

    // Return 201 if insert succeeded
    if (result.lastInsertRowid) {
      res.status(201).json({
        id: result.lastInsertRowid,
        name: p,
        price: pr,
        description,
        quantity: q,
      });
    } else {
      res.status(400).json({ error: "Failed to add the product" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to add the product" });
  }
});

/**
 * DELETE /products/:id
 * Deletes a product by ID
 */
app.delete("/products/:id", (req, res) => {
  try {
    const del = db.prepare("DELETE FROM products WHERE id=?");
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid product id" });
    const result = del.run(id);

    if (result.changes === 1) {
      res.status(200).json({ message: "Product deleted successfully" });
      // Alternative: res.status(204).send(); for "No Content"
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to delete the product" });
  }
});

/**
 * PUT /products
 * Updates a product by ID (expects full product in body) - backwards-compatible
 */
app.put("/products", (req, res) => {
  try {
    const { id, name, price, description, quantity } = req.body;
    const pid = parseInt(id, 10);
    if (isNaN(pid)) return res.status(400).json({ error: "Invalid or missing id in request body" });

    const pName = (name || "").trim();
    if (!pName || pName.length < 1) return res.status(400).json({ error: "Name is required" });

    const pPrice = parseFloat(price);
    const pQty = parseInt(quantity, 10);
    if (isNaN(pPrice) || isNaN(pQty)) return res.status(400).json({ error: "Price and quantity must be numbers" });

    const update = db.prepare(
      "UPDATE products SET name=?, price=?, description=?, quantity=? WHERE id=?"
    );
    const result = update.run(pName, pPrice, description || "", pQty, pid);

    if (result.changes >= 1) {
      res.status(200).json({ id: pid, name: pName, price: pPrice, description, quantity: pQty });
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to update the product", details: error.message });
  }
});

/**
 * PUT /products/:id
 * RESTful update route (id in URL)
 */
app.put("/products/:id", (req, res) => {
  try {
    const pid = parseInt(req.params.id, 10);
    if (isNaN(pid)) return res.status(400).json({ error: "Invalid product id in URL" });

    const { name, price, description, quantity } = req.body;
    const pName = (name || "").trim();
    if (!pName || pName.length < 1) return res.status(400).json({ error: "Name is required" });

    const pPrice = parseFloat(price);
    const pQty = parseInt(quantity, 10);
    if (isNaN(pPrice) || isNaN(pQty)) return res.status(400).json({ error: "Price and quantity must be numbers" });

    const update = db.prepare(
      "UPDATE products SET name=?, price=?, description=?, quantity=? WHERE id=?"
    );
    const result = update.run(pName, pPrice, description || "", pQty, pid);

    if (result.changes >= 1) {
      res.status(200).json({ id: pid, name: pName, price: pPrice, description, quantity: pQty });
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to update the product", details: error.message });
  }
});

/**
 * Example top products
 * Mock data only
 */
app.get("/top_products", (req, res) => {
  res.json({
    product: ["Iphone 16", "JBL c15", "Dell XPS 16", "Pixel 8 pro", "LG G8"],
    count: [3, 6, 10, 2, 32],
  });
});

/**
 * Example sold products
 * Mock data only
 */
app.get("/sold_products", (req, res) => {
  res.json({
    category: ["Phones", "Headphones", "Laptops", "Chargers", "TVs"],
    count: [23, 67, 12, 60, 15],
  });
});

// -------------------- START SERVER --------------------
app.listen(PORT, () =>
  console.log(`server started, listening at port ${PORT}`)
);