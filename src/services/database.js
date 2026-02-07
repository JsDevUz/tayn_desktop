const knex = require('knex');
const path = require('path');

class DatabaseService {
  constructor() {
    this.db = null;
    this.isOnline = false;
  }

  async initialize() {
    try {
      // Local PostgreSQL configuration
      this.db = knex({
        client: 'pg',
        connection: {
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'tayn_pos_local'
        },
        migrations: {
          directory: path.join(__dirname, '../migrations')
        }
      });

      // Test connection
      await this.db.raw('SELECT 1');
      
      // Run migrations
      await this.runMigrations();
      
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      // Create tables if they don't exist
      await this.createTables();
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async createTables() {
    // Products table (matching server schema + sync fields)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        description TEXT,
        barcode TEXT,
        sku TEXT,
        type TEXT NOT NULL DEFAULT 'physical',
        track_inventory BOOLEAN NOT NULL DEFAULT true,
        unit_type TEXT,
        unit_name TEXT,
        can_split BOOLEAN NOT NULL DEFAULT false,
        batch_required BOOLEAN NOT NULL DEFAULT false,
        serial_required BOOLEAN NOT NULL DEFAULT false,
        base_supply_price DECIMAL(14,2),
        base_retail_price DECIMAL(14,2),
        company_id TEXT NOT NULL,
        photos JSONB DEFAULT '[]',
        sizes JSONB,
        packaging JSONB,
        measurement JSONB,
        sales_channels TEXT[] DEFAULT '{STORE}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for products
    await this.db.raw('CREATE UNIQUE INDEX IF NOT EXISTS products_sku_uidx ON products(sku)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS products_company_idx ON products(company_id)');

    // Product Stocks table (matching server schema + sync fields)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS product_stocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_type TEXT NOT NULL,
        location_id TEXT NOT NULL,
        product_id UUID NOT NULL,
        quantity BIGINT NOT NULL,
        supply_price DECIMAL(14,2) NOT NULL,
        retail_price DECIMAL(14,2) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        batch_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for product_stocks
    await this.db.raw('CREATE INDEX IF NOT EXISTS product_stocks_product_idx ON product_stocks(product_id)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS product_stocks_location_idx ON product_stocks(location_id)');
    await this.db.raw('CREATE UNIQUE INDEX IF NOT EXISTS product_stocks_plb_uidx ON product_stocks(product_id, location_id, batch_id)');

    // Stock Movements table (matching server schema + sync fields)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        batch_id TEXT,
        movement_id UUID NOT NULL,
        location_id TEXT,
        location_type TEXT NOT NULL,
        event TEXT NOT NULL,
        direction TEXT NOT NULL,
        quantity_before BIGINT NOT NULL,
        quantity_change BIGINT NOT NULL,
        quantity_after BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for stock_movements
    await this.db.raw('CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements(product_id)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS stock_movements_movement_idx ON stock_movements(movement_id)');

    // Warehouses table (matching server schema + sync fields)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        company_id TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Stores table (matching server schema + sync fields)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS stores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        company_id TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Warehouse Stores table (matching server schema + sync fields)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS warehouse_stores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        warehouse_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for warehouse_stores
    await this.db.raw('CREATE INDEX IF NOT EXISTS warehouse_stores_warehouse_idx ON warehouse_stores(warehouse_id)');
    await this.db.raw('CREATE UNIQUE INDEX IF NOT EXISTS warehouse_stores_store_company_uidx ON warehouse_stores(store_id, company_id)');

    // Categories table (matching server schema + sync fields)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        legacy_id INTEGER,
        title TEXT NOT NULL,
        icon TEXT,
        has_child BOOLEAN,
        parent_id TEXT,
        seo_header TEXT,
        seo_meta_tag TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for categories
    await this.db.raw('CREATE UNIQUE INDEX IF NOT EXISTS categories_legacy_id_uidx ON categories(legacy_id)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id)');

    // Sales table (POS schema)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        cashier_id UUID NOT NULL,
        client_id UUID,
        sale_code VARCHAR(50) UNIQUE,
        total_amount DECIMAL(12,2) NOT NULL,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        final_amount DECIMAL(12,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        event_type TEXT NOT NULL DEFAULT 'sale',
        ref_sale_id UUID,
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for sales
    await this.db.raw('CREATE INDEX IF NOT EXISTS sales_store_idx ON sales(store_id)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS sales_cashier_idx ON sales(cashier_id)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS sales_status_idx ON sales(status)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS sales_date_idx ON sales(created_at)');

    // Sale items table (POS schema)
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id UUID NOT NULL,
        product_id UUID NOT NULL,
        variant_id UUID,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        total_price DECIMAL(12,2) NOT NULL,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        batch_id TEXT,
        warehouse_id UUID,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        is_sync BOOLEAN DEFAULT false,
        last_sync TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for sale_items
    await this.db.raw('CREATE INDEX IF NOT EXISTS sale_items_sale_idx ON sale_items(sale_id)');
    await this.db.raw('CREATE INDEX IF NOT EXISTS sale_items_product_idx ON sale_items(product_id)');

    // Sync log table
    await this.db.raw(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        data JSONB,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for sync_logs
    await this.db.raw('CREATE INDEX IF NOT EXISTS sync_logs_entity_idx ON sync_logs(entity_type, entity_id)');
  }

  async query(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.raw(sql, params);
  }

  async syncWithServer(serverData) {
    const results = {
      products: { success: 0, failed: 0 },
      categories: { success: 0, failed: 0 },
      sales: { success: 0, failed: 0 }
    };

    try {
      // Sync products
      if (serverData.products) {
        for (const product of serverData.products) {
          try {
            await this.upsertProduct(product);
            results.products.success++;
          } catch (error) {
            results.products.failed++;
            console.error('Failed to sync product:', product.id, error);
          }
        }
      }

      // Sync categories
      if (serverData.categories) {
        for (const category of serverData.categories) {
          try {
            await this.upsertCategory(category);
            results.categories.success++;
          } catch (error) {
            results.categories.failed++;
            console.error('Failed to sync category:', category.id, error);
          }
        }
      }

      // Upload local changes to server
      await this.uploadLocalChanges();

      return results;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  async upsertProduct(product) {
    const existing = await this.db('products').where('server_id', product.id).first();
    
    if (existing) {
      return await this.db('products')
        .where('server_id', product.id)
        .update({
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          sku: product.sku,
          barcode: product.barcode,
          category_id: product.category_id,
          stock_quantity: product.stock_quantity,
          min_stock_level: product.min_stock_level,
          is_active: product.is_active,
          image_url: product.image_url,
          updated_at: new Date(),
          last_sync: new Date()
        });
    } else {
      return await this.db('products').insert({
        server_id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        cost: product.cost,
        sku: product.sku,
        barcode: product.barcode,
        category_id: product.category_id,
        stock_quantity: product.stock_quantity,
        min_stock_level: product.min_stock_level,
        is_active: product.is_active,
        image_url: product.image_url,
        created_at: new Date(),
        updated_at: new Date(),
        last_sync: new Date()
      });
    }
  }

  async upsertCategory(category) {
    const existing = await this.db('categories').where('server_id', category.id).first();
    
    if (existing) {
      return await this.db('categories')
        .where('server_id', category.id)
        .update({
          name: category.name,
          description: category.description,
          parent_id: category.parent_id,
          is_active: category.is_active,
          updated_at: new Date(),
          last_sync: new Date()
        });
    } else {
      return await this.db('categories').insert({
        server_id: category.id,
        name: category.name,
        description: category.description,
        parent_id: category.parent_id,
        is_active: category.is_active,
        created_at: new Date(),
        updated_at: new Date(),
        last_sync: new Date()
      });
    }
  }

  async uploadLocalChanges() {
    // Upload unsynced sales
    const unsyncedSales = await this.db('sales').whereNull('synced_at');
    
    for (const sale of unsyncedSales) {
      try {
        // TODO: Implement server upload logic
        await this.db('sales')
          .where('id', sale.id)
          .update({ synced_at: new Date() });
      } catch (error) {
        console.error('Failed to upload sale:', sale.id, error);
      }
    }
  }

  async close() {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
    }
  }
}

module.exports = DatabaseService;
