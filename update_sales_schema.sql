-- Drop and recreate sales table with pos-schema
DROP TABLE IF EXISTS sales CASCADE;

-- Create sales table matching pos-schema
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  cashier_id UUID NOT NULL,
  client_id UUID,
  
  -- Financial
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL,
  
  -- Status Management
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Sale Type
  event_type TEXT NOT NULL DEFAULT 'sale',
  
  -- References
  ref_sale_id UUID,
  
  -- Metadata
  notes TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- Success message
SELECT 'Sales table updated to pos-schema' as status;
