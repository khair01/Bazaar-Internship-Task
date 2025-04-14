-- Products Table
CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY,  
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price REAL NOT NULL CHECK (unit_price >= 0), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Stock Table
CREATE TABLE IF NOT EXISTS product_stock (
    sku TEXT PRIMARY KEY,  
    quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT (datetime('now')),
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL,
    movement_type TEXT CHECK (movement_type IN ('stock-in', 'sale', 'manual-removal')) NOT NULL,
    quantity INTEGER NOT NULL,
    movement_timestamp TIMESTAMP DEFAULT (datetime('now')),
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);


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
