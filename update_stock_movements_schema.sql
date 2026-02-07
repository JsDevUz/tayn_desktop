-- Drop and recreate stock_movements table with server schema
DROP TABLE IF EXISTS stock_movements CASCADE;

-- Create stock_movements table matching server schema
CREATE TABLE stock_movements (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_movement_id ON stock_movements(movement_id);

-- Success message
SELECT 'Stock movements table updated to server schema' as status;
