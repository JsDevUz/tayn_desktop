import { authAPI } from "./axios";

class AuthService {
  constructor() {
    this.serverUrl = process.env.SERVER_URL || "http://localhost:8080";
    this.token = null;
    this.user = null;
    this.company = null;
    this.warehouses = [];
    this.stores = [];
    this.permissions = [];
  }

  async login(email, password) {
    try {
      const response = await authAPI.login({ email, password });
      console.log("Login response:", response); // Debug

      // Server returns { accessToken: "token" }
      const accessToken =
        response.accessToken || response.data?.data?.accessToken;

      if (!accessToken) {
        throw new Error("No access token received");
      }

      // Save token immediately
      this.token = accessToken;
      localStorage.setItem("auth_token", accessToken);

      // Get user data with company, warehouses, stores
      const userResponse = await authAPI.getMe();
      console.log("GetMe response:", userResponse); // Debug

      const { user, company, warehouses, stores, permissions } =
        userResponse.data;

      this.user = user;
      this.company = company;
      this.warehouses = warehouses;
      this.stores = stores;
      this.permissions = permissions;

      // Save to local storage
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("company", JSON.stringify(company));
      localStorage.setItem("warehouses", JSON.stringify(warehouses));
      localStorage.setItem("stores", JSON.stringify(stores));
      localStorage.setItem("permissions", JSON.stringify(permissions));

      return {
        success: true,
        data: {
          token: accessToken,
          user,
          company,
          warehouses,
          stores,
          permissions,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Login failed",
      };
    }
  }

  async logout() {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.clearAuth();
    }
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    this.company = null;
    this.warehouses = [];
    this.stores = [];
    this.permissions = [];

    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("company");
    localStorage.removeItem("warehouses");
    localStorage.removeItem("stores");
    localStorage.removeItem("permissions");
    localStorage.removeItem("selected_warehouse_id");
    localStorage.removeItem("selected_store_id");
  }

  loadFromStorage() {
    try {
      this.token = localStorage.getItem("auth_token");
      this.user = JSON.parse(localStorage.getItem("user") || "null");
      this.company = JSON.parse(localStorage.getItem("company") || "null");
      this.warehouses = JSON.parse(localStorage.getItem("warehouses") || "[]");
      this.stores = JSON.parse(localStorage.getItem("stores") || "[]");
      this.permissions = JSON.parse(
        localStorage.getItem("permissions") || "[]",
      );

      return this.token !== null;
    } catch (error) {
      console.error("Failed to load auth from storage:", error);
      this.clearAuth();
      return false;
    }
  }

  async refreshUserData() {
    try {
      if (!this.token) return false;

      const userResponse = await authAPI.getMe();
      const { user, company, warehouses, stores, permissions } =
        userResponse.data;

      this.user = user;
      this.company = company;
      this.warehouses = warehouses;
      this.stores = stores;
      this.permissions = permissions;

      // Update local storage
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("company", JSON.stringify(company));
      localStorage.setItem("warehouses", JSON.stringify(warehouses));
      localStorage.setItem("stores", JSON.stringify(stores));
      localStorage.setItem("permissions", JSON.stringify(permissions));

      return true;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      if (error.response?.status === 401) {
        this.clearAuth();
      }
      return false;
    }
  }

  isAuthenticated() {
    return this.token !== null;
  }

  getAuthHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  getSelectedWarehouse() {
    const selectedId = localStorage.getItem("selected_warehouse_id");
    return this.warehouses.find((w) => w.id === parseInt(selectedId));
  }

  setSelectedWarehouse(warehouse) {
    localStorage.setItem("selected_warehouse_id", warehouse.id);
  }

  getSelectedStore() {
    const selectedId = localStorage.getItem("selected_store_id");
    if (!selectedId) return null;
    // Compare as strings - store IDs are UUIDs, not integers
    return this.stores.find((s) => s.id === selectedId);
  }

  setSelectedStore(store) {
    localStorage.setItem("selected_store_id", store.id);
  }
}

export default AuthService;
