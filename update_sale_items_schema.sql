-- Drop and recreate sale_items table with pos-schema
DROP TABLE IF EXISTS sale_items CASCADE;

-- Create sale_items table matching pos-schema
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  
  -- Product Info
  product_id UUID NOT NULL,
  variant_id UUID,
  
  -- Quantity & Pricing
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  
  -- Discounts
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Stock Info
  batch_id TEXT,
  warehouse_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Success message
SELECT 'Sale items table updated to pos-schema' as status;
