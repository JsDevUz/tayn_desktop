// Sync Service - Product-Centric Transactional Sync
// Each product_stock is synced with its related stock_movements, sale, and sale_items

import { api } from "./axios";

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
  }

  startBackgroundSync(intervalMs = 60000) {
    console.log(
      "🚀 SyncService.startBackgroundSync() called with interval:",
      intervalMs,
    );
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.syncAll(), intervalMs);
    // Also run immediately
    console.log("🚀 Running initial sync...");
    this.syncAll();
  }

  stopBackgroundSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log("🔄 Starting background sync...");

    try {
      // 1. Check Internet
      const isOnline = navigator.onLine;
      if (!isOnline) {
        console.log("📴 Offline: Skipping sync");
        this.isSyncing = false;
        return;
      }

      // 2. Sync Product Stocks (with related data)
      await this.syncProductStocks();

      console.log("✅ Background sync completed");
    } catch (error) {
      console.error("❌ Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Product-Centric Sync
   * For each unsynced product_stock:
   * 1. Get related stock_movements by product_id
   * 2. Get related sale via stock_movements.movement_id (which is sale_id)
   * 3. Get related sale_items for each sale
   * 4. Bundle all and send to server
   * 5. On success: mark all as synced
   * 6. On failure: log to sync_logs, continue to next
   */
  async syncProductStocks() {
    try {
      // 1. Get unsynced product_stocks
      const stocksResult = await window.electronAPI.db.query(`
        SELECT * FROM product_stocks WHERE is_sync = false LIMIT 50
      `);

      if (!stocksResult.success || stocksResult.data.rows.length === 0) {
        console.log("📦 No unsynced product_stocks");
        return;
      }

      const productStocks = stocksResult.data.rows;
      console.log(`📤 Processing ${productStocks.length} product_stocks...`);

      const bundles = [];

      for (const stock of productStocks) {
        const bundleId = `bundle-${stock.id}-${Date.now()}`;

        // 2. Get related stock_movements by product_id
        const movementsResult = await window.electronAPI.db.query(
          `
          SELECT * FROM stock_movements 
          WHERE product_id = ? AND is_sync = false
        `,
          [stock.product_id],
        );

        const movements = movementsResult.success
          ? movementsResult.data.rows
          : [];

        // Format movements
        const formattedMovements = movements.map((mov) => ({
          id: mov.id,
          movementId: mov.movement_id, // This is the sale_id
          productId: mov.product_id,
          batchId: mov.batch_id || "default",
          locationType: mov.location_type,
          locationId: mov.location_id,
          event: mov.event,
          direction: mov.direction,
          quantityBefore: Number(mov.quantity_before),
          quantityChange: Number(mov.quantity_change),
          quantityAfter: Number(mov.quantity_after),
          status: mov.status,
          createdAt: mov.created_at
            ? new Date(mov.created_at).toISOString()
            : new Date().toISOString(),
        }));

        // 3. Get ALL related sales via movement_id (which links to sale_id)
        const saleIds = [
          ...new Set(movements.map((m) => m.movement_id).filter(Boolean)),
        ];

        // Get ALL unsynced sales for this product
        let sales = [];
        if (saleIds.length > 0) {
          const saleResult = await window.electronAPI.db.query(
            `
            SELECT * FROM sales 
            WHERE id IN (${saleIds.map(() => "?").join(",")})
            AND status = 'completed'
          `,
            saleIds,
          );

          if (saleResult.success && saleResult.data.rows.length > 0) {
            sales = saleResult.data.rows;
          }
        }

        // Format product stock
        const formattedStock = {
          id: stock.id,
          productId: stock.product_id,
          locationType: stock.location_type,
          locationId: stock.location_id,
          quantity: Number(stock.quantity),
          supplyPrice: Number(stock.supply_price || 0),
          retailPrice: Number(stock.retail_price || 0),
          batchId: stock.batch_id || "default",
          expiresAt: stock.expires_at
            ? new Date(stock.expires_at).toISOString()
            : null,
        };

        // If no sales, still bundle the product_stock and movements
        if (sales.length === 0) {
          bundles.push({
            bundleId: `bundle-${stock.id}-${Date.now()}`,
            productId: stock.product_id,
            productStock: formattedStock,
            stockMovements: formattedMovements,
            sale: null,
          });
        } else {
          // Create a bundle for EACH sale
          for (const saleRow of sales) {
            // Get sale items
            const itemsResult = await window.electronAPI.db.query(
              `SELECT * FROM sale_items WHERE sale_id = ?`,
              [saleRow.id],
            );
            const items = itemsResult.success ? itemsResult.data.rows : [];

            // Get movements specific to this sale
            const saleMovements = movements.filter(
              (m) => m.movement_id === saleRow.id,
            );
            const formattedSaleMovements = saleMovements.map((mov) => ({
              id: mov.id,
              movementId: mov.movement_id,
              productId: mov.product_id,
              batchId: mov.batch_id || "default",
              locationType: mov.location_type,
              locationId: mov.location_id,
              event: mov.event,
              direction: mov.direction,
              quantityBefore: Number(mov.quantity_before),
              quantityChange: Number(mov.quantity_change),
              quantityAfter: Number(mov.quantity_after),
              status: mov.status,
              createdAt: mov.created_at
                ? new Date(mov.created_at).toISOString()
                : new Date().toISOString(),
            }));

            // Format sale with items
            const sale = {
              id: saleRow.id,
              storeId: saleRow.store_id,
              cashierId: saleRow.cashier_id,
              clientId: saleRow.client_id,
              saleCode: saleRow.sale_code,
              totalAmount: Number(saleRow.total_amount),
              finalAmount: Number(saleRow.final_amount),
              discountAmount: Number(saleRow.discount_amount),
              taxAmount: Number(saleRow.tax_amount),
              status: saleRow.status,
              eventType: "sale", // Default event type
              notes: saleRow.notes,
              metadata: saleRow.metadata,
              createdAt: new Date(saleRow.created_at).toISOString(),
              completedAt: saleRow.completed_at
                ? new Date(saleRow.completed_at).toISOString()
                : null,
              items: items.map((item) => {
                // Check if product is split-able based on stock/product info
                // We rely on "packaging" field in products, but here we only have sale_items.
                // However, we have the `productStock` (stock) which links to product_id.
                // We might need to fetch the product to know if it's split-able.
                // But typically for sync we just send what is in DB.
                // User requirement: "saleitem quanitty 1 emas 61 ketishi kerak edi"
                // This implies conversion.
                // We can't easily get product details here without a join.
                // Let's assume we can fetch product details or use a JOIN in the items query.
                // BUT, sync.js logic is complex.
                // Let's simpler: The user complained about specific payload.
                // If we want 61, we need to know unitsPerPack.

                // Let's try to find the product info from 'productStocks' array if possible?
                // No, productStocks is the parent list. 'stock' is the current product item.
                // 'stock' object is available here!
                // But 'stock' is from 'product_stocks' table. It might not have 'packaging'.
                // We need to fetch 'packaging' from 'products' table.

                return {
                  id: item.id,
                  productId: item.product_id,
                  variantId: item.variant_id,
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unit_price),
                  totalPrice: Number(item.total_price),
                  discountAmount: Number(item.discount_amount),
                  discountPercent: Number(item.discount_percent),
                  batchId: item.batch_id,
                  warehouseId: item.warehouse_id,
                };
              }),
              payments: [], // fetched separately if needed, but usually linked via sale_id
              // REMOVED stockMovements from here to avoid duplication
            };

            // We need to know 'unitsPerPack' to convert items.
            // Let's modify the items mapping to fetch product details if needed?
            // Or better, let's update the items query to join products.

            // Re-query items with product packaging info
            const itemsWithProduct = await window.electronAPI.db.query(
              `SELECT si.*, p.can_split, p.packaging 
               FROM sale_items si
               LEFT JOIN products p ON si.product_id = p.id
               WHERE si.sale_id = ?`,
              [saleRow.id],
            );

            const realItems = itemsWithProduct.success
              ? itemsWithProduct.data.rows
              : [];

            sale.items = realItems.map((item) => {
              let quantity = Number(item.quantity);
              let unitPrice = Number(item.unit_price);

              const packaging =
                typeof item.packaging === "string"
                  ? JSON.parse(item.packaging)
                  : item.packaging;
              const unitsPerPack = packaging?.unitsPerPack || 1;

              if (item.can_split && unitsPerPack > 1) {
                // Convert Packs to Base Units
                quantity = Math.round(quantity * unitsPerPack);
                // Convert Price per Pack to Price per Unit
                unitPrice = unitPrice / unitsPerPack;
              }

              return {
                id: item.id,
                productId: item.product_id,
                variantId: item.variant_id,
                quantity: quantity,
                unitPrice: unitPrice,
                totalPrice: Number(item.total_price),
                discountAmount: Number(item.discount_amount),
                discountPercent: Number(item.discount_percent),
                batchId: item.batch_id,
                warehouseId: item.warehouse_id,
              };
            });

            bundles.push({
              bundleId: `bundle-${stock.id}-${saleRow.id}-${Date.now()}`,
              productId: stock.product_id,
              productStock: formattedStock,
              stockMovements: formattedSaleMovements,
            });
          }
        }
      }

      if (bundles.length === 0) {
        console.log("📦 No bundles to sync");
        return;
      }

      // 4. Send to Server
      console.log(`📤 Sending ${bundles.length} bundles to server...`);
      const response = await api.post("/pos/sync/product-stocks", { bundles });

      console.log("Server Response:", response);

      if (response && (response.success || response.data?.success)) {
        const responseData = response.data || response;
        const { success = [], failed = [] } = responseData;

        console.log("✅ Synced bundles:", success);
        console.log("❌ Failed bundles:", failed);

        // 5. Mark successful ones as synced
        for (const bundleId of success) {
          // Find the bundle
          const bundle = bundles.find((b) => b.bundleId === bundleId);
          if (!bundle) continue;

          // Mark product_stock as synced
          await window.electronAPI.db.query(
            `UPDATE product_stocks SET is_sync = true, last_sync = CURRENT_TIMESTAMP WHERE id = ?`,
            [bundle.productStock.id],
          );

          // Mark stock_movements as synced
          for (const mov of bundle.stockMovements) {
            await window.electronAPI.db.query(
              `UPDATE stock_movements SET is_sync = true, last_sync = CURRENT_TIMESTAMP WHERE id = ?`,
              [mov.id],
            );
          }

          // Mark sale and sale_items as synced
          if (bundle.sale) {
            await window.electronAPI.db.query(
              `UPDATE sales SET is_sync = true, last_sync = CURRENT_TIMESTAMP WHERE id = ?`,
              [bundle.sale.id],
            );
            await window.electronAPI.db.query(
              `UPDATE sale_items SET is_sync = true, last_sync = CURRENT_TIMESTAMP WHERE sale_id = ?`,
              [bundle.sale.id],
            );
          }
        }

        // 6. Log failures to sync_logs
        for (const fail of failed) {
          await window.electronAPI.db.query(
            `
            INSERT INTO sync_logs (entity_type, entity_id, action, status, error_message)
            VALUES ('product_stock_bundle', ?, 'sync', 'failed', ?)
          `,
            [fail.bundleId || fail.productId, fail.error],
          );
        }
      }
    } catch (error) {
      console.error("Error syncing product_stocks:", error);
      // Log the error
      await window.electronAPI.db.query(
        `
        INSERT INTO sync_logs (entity_type, entity_id, action, status, error_message)
        VALUES ('sync_all', 'batch', 'sync', 'failed', ?)
      `,
        [error.message || String(error)],
      );
    }
  }
}

export const syncService = new SyncService();
