
export enum OrderStatus {
  PENDING = 'PENDENTE',
  RECEIVED = 'RECEBIDO'
}

export interface Item {
  id: string;
  name: string;
  unit: string;
  dosage: number; // Number of doses per unit
  manufacturer?: string; // Optional manufacturer info
}

export interface ItemMonthlyConfig {
  itemId: string;
  monthIndex: number;
  averageCost: number;
  minStock: number;
}

export interface OrderItem {
  itemId: string;
  quantity: number;
  actualDate?: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface Order {
  id: string;
  requestName: string; // Ex: "Ceva Janeiro/26"
  expectedDate: string;
  status: OrderStatus;
  items: OrderItem[];
}

export interface InventoryMonthData {
  itemId: string;
  monthIndex: number; // 0-11
  year?: number;
  weeks: [number | null, number | null, number | null, number | null]; 
  weekDates: [string, string, string, string]; // Dates for S1, S2, S3, S4
  manualInitialStock?: number; 
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  type: 'INVENTORY' | 'ORDER' | 'CATALOG';
  action: string;
  details: string;
}

export type ViewType = 'dashboard' | 'inventory' | 'orders' | 'fiscal' | 'settings' | 'support';
