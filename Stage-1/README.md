# Bazaar’s Task

Status: In progress

### Table of Content

# Stage 1

### 1. Technologies Used

- **Express.js**: We have used Express.js for building the backend API to handle all routes and product stock movements.
- **SQLite**: SQLite was chosen as the database for this project because of its lightweight nature and ease of use for small to medium-scale applications like inventory tracking for a single store.
- **Singleton Pattern for Database Connection**: To ensure that there is only a single database connection throughout the lifetime of the application, we have implemented a singleton instance for the SQLite connection.

### 2. Design Decisions

### 2.1 Data Modeling

In this stage, the design focuses on tracking product inventory and stock movements for a single kiryana store. The following tables have been created for efficient data modeling:

- **`Products Table`**: This table stores essential information about each product, including the SKU, name, category, and unit price. The **`SKU`** serves as the unique identifier for each product.
    
    ```jsx
    CREATE TABLE IF NOT EXISTS products (
        sku TEXT PRIMARY KEY,  
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit_price REAL NOT NULL CHECK (unit_price >= 0), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```
    
- **`Product Stock Table`**: This table stores the current stock quantity for each product, ensuring we can track how many items are available. The quantity is updated dynamically based on stock-in, sales, or manual removals.
    
    ```jsx
    CREATE TABLE IF NOT EXISTS product_stock (
        sku TEXT PRIMARY KEY,  
        quantity INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT (datetime('now')),
        FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
    );
    ```
    
- **`Stock Movements Table`**: This table records every movement of stock—whether it's a stock-in (new stock), sale, or manual removal of stock. The movement type helps to categorize these actions, and the quantity represents the number of items moved.
    
    ```jsx
    CREATE TABLE IF NOT EXISTS stock_movements (
        movement_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT NOT NULL,
        movement_type TEXT CHECK (movement_type IN ('stock-in', 'sale', 'manual-removal')) NOT NULL,
        quantity INTEGER NOT NULL,
        movement_timestamp TIMESTAMP DEFAULT (datetime('now')),
        FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
    );
    
    ```
    

### Triggers Used

```jsx
CREATE TRIGGER insert_product_stock
AFTER INSERT ON products
FOR EACH ROW
BEGIN
    INSERT INTO product_stock (sku, quantity)
    VALUES (NEW.sku, 0);
END;

CREATE TRIGGER update_product_stock
AFTER INSERT ON stock_movements
FOR EACH ROW
BEGIN
    UPDATE product_stock
    SET quantity = quantity + NEW.quantity,
        last_updated = datetime('now')
    WHERE sku = NEW.sku;
END;
```

### 2.1.1 Why Triggers?

Triggers are used instead of implementing the logic directly in the backend for the following reasons:

- **Performance**: Triggers reduce the load on the backend server by automatically updating the stock quantity after each stock movement (stock-in, sale, or manual removal).
- **Data Integrity**: Triggers help ensure consistency between the `product_stock` and `stock_movements` tables, as they automatically update stock levels when new stock movements are inserted.

---

### 3. Assumptions:

- System is designed for a single store without multi-store support.
- Authentication and access control not implemented in current stage.
- All stock movements are logged for tracking and auditing.
- Basic API designed for simple front-end integration, without security features.
- `SKU format: first 4 letters of product name + first 3 letters of category + 6-character Unique ID using nanoid.`

---

### 4. API Design

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/product/get-products` | fetch all products of store |
| GET | `/product/get-product/:sku` | fetch a particular product |
| GET | `/product/get-product-stock/:sku` | fetch stock of a particular product |
| GET | `/product/get-stock-movements/:sku` | fetches stock movements of product |
| POST | `/product/add-product` | adds a product to store |
| POST | `/product/remove` | manually removes defined stock of product |
| POST | `/product/stock-in` | stocks in given stock of a product |
| POST | `/product/sell` | sells given stock of product |

---

# Stage 2

### 1. Technologies Used

- **Express.js**: We use Express.js to build the backend API, handling routes and managing inventory operations efficiently.
- **Supabase**: We've upgraded from SQLite to PostgreSQL (hosted on Supabase) to provide better scalability, concurrency, and data integrity in multi-user environments.
- **Connection Pooling for Database Management**: Rather than using a singleton connection, we implement connection pooling to handle multiple database requests efficiently and enhance performance during high traffic.

---

### 2. Design Decisions

### **2.1 Migration to PostgreSQL**

We migrated from SQLite to Supabase-hosted PostgreSQL to support a scalable, cloud-based multi-user environment. PostgreSQL provides robust data integrity features, efficient indexing, and supports concurrent access, which is essential for growing beyond a single store setup.

### 2.2 Schema Improvements and Centralized Product Catalog

To improve upon the Stage 1 schema and prepare for multi-store usage:

**Centralized Product Catalog Introduced**

A new design decision was to separate the `products` table into a **central catalog**, accessible by all stores.

- Only users with the role **Admin** or **Supplier** can **add, update, or remove** products from this catalog.
- All registered stores can **view the catalog** and **stock in products** into their `local` inventory.
- This ensures **consistency** in product definitions (SKU, name, category) and eliminates redundancy.

**Store-specific Inventory**:

- The `product_stock` table was extended to support multiple stores by including a `store_id` foreign key.
- Stock movements are also logged per store, providing fine-grained tracking.

**Schema Enhancements:**

![image.png](image.png)

### **2.3 Authorization (Cookies & Roles)**

Role-based access control has been implemented using **JWTs** stored in **cookies**:

- **User Roles**:
    - `admin`:
        - Can manage the **central product catalog** (add, update, delete products).
        - Has full access to product-level APIs like `/product/add`, `/product/remove`, etc.
    - `store user`:
        - Can **stock in**, **sell**, or **remove** products **only for their assigned store**.
        - Cannot modify the global product catalog.
- **Authorization via Cookies**:
    - JWT is stored in an **HTTP-only cookie**.
    - The backend checks cookie content to extract the **user role** and/or **store_id**.
    - Example Checks:
        - Accessing `/product/add` → Requires a cookie with `user = 'admin'`.
        - Accessing `/store/:storeid/stock-in` → Requires a cookie with `store_id = :storeid`.
- **Security Handling**:
    - Unauthorized requests receive a 403 response.
    - Cookies are validated on each protected route.
    - Admin and Store routes are separated to enforce clear access boundaries.

### **2.4 Rate Limiting**

To protect the API and ensure fair usage, rate limiting is enforced using `express-rate-limit`.

- **General Routes**: Max **100 requests/15 minutes** per IP.
- **Sensitive Routes**:
    - `/product/add`, `/product/remove`: **30 requests/hour** (admin only)
    - `/store/:storeid/stock-in`: **60 requests/10 minutes**

This helps prevent abuse, maintain performance, and avoid accidental overuse. Custom middleware returns a `429 Too Many Requests` error when limits are exceeded.

---

### 3. Assumptions

- **SKU** is used for product uniqueness and identification as per standard. Other IDs, like `store_id` and `user_id`, are generated using **nanoid** for unique identification.
- **Authentication and access control** are implemented using JWTs stored in cookies, ensuring only authorized users can access specific routes based on their roles (admin or store user).
- **All stock movements** (stock-in, sales, removals) are logged for tracking and auditing in the `stock_movements` table.
- **Rate limiting** is enforced to prevent abuse, with stricter limits for sensitive routes like product modification and stock transactions.

---

### 4. API Design

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/product/get-products` | fetch all products of store |
| GET | `/product/get-product/:sku` | fetch a particular product |
| GET | `/product/get-product-stock/:sku` | fetch stock of a particular product |
| GET | `/product/get-stock-movements/:sku` | fetches stock movements of product |
| POST | `/product/add-product` | adds a product to store |
| POST | `/product/remove` | manually removes defined stock of product |
| POST | `/product/stock-in` | stocks in given stock of a product |
| POST | `/product/sell` | sells given stock of product |
