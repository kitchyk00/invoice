export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface SellerInfo {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip: string;
  country: string;
  taxId: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  logoUrl?: string;
}

export interface ClientInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip: string;
  country: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  seller: SellerInfo;
  client: ClientInfo;
  items: LineItem[];
  taxRate: number; // percentage e.g. 10
  discount: number; // percentage or fixed amount
  discountType: 'percentage' | 'fixed';
  notes: string;
  terms: string;
  accentColor: string;
}
