import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, Download, Printer, Save, RefreshCw, 
  Building2, User, FileText, Check,
  DollarSign, Hash, Image as ImageIcon
} from 'lucide-react';
import type { InvoiceData, LineItem, SellerInfo, ClientInfo } from './types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const STORAGE_KEY_SELLER = 'invoice_app_default_seller';
const STORAGE_KEY_COLOR = 'invoice_app_accent_color';

const DEFAULT_SELLER: SellerInfo = {
  name: 'Matt Kitchker',
  businessName: 'MK Designs',
  email: 'matt.kitchker@gmail.com',
  phone: '07775568442',
  address: '2 Kensington Close',
  cityStateZip: 'Northampton, NN2 6NP',
  country: 'United Kingdom',
  taxId: '',
  bankName: 'Chase Bank',
  accountNumber: '61350820',
  sortCode: '60-84-07',
  logoUrl: '/logo.svg'
};

const DEFAULT_CLIENT: ClientInfo = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  cityStateZip: '',
  country: ''
};

const BRAND_ACCENT_COLOR = '#0284c7';

const formatInvoiceNumberFromDate = (dateStr?: string) => {
  if (!dateStr) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `INV-${day}${month}${year}`;
  }
  const [year, month, day] = dateStr.split('-');
  if (year && month && day) {
    return `INV-${day}${month}${year}`;
  }
  const date = new Date(dateStr);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `INV-${d}${m}${y}`;
};

const formatDateUK = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

export default function App() {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load initial seller from local storage if exists, else fallback to DEFAULT_SELLER
  const getInitialSeller = (): SellerInfo => {
    const saved = localStorage.getItem(STORAGE_KEY_SELLER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new defaults if missing or outdated, update /logo.png to /logo.svg
        const logoUrl = (!parsed.logoUrl || parsed.logoUrl === '/logo.png') ? '/logo.svg' : parsed.logoUrl;
        return {
          ...DEFAULT_SELLER,
          ...parsed,
          logoUrl,
          sortCode: parsed.sortCode || parsed.routingOrIban || DEFAULT_SELLER.sortCode,
        };
      } catch (e) {
        console.error('Failed to parse saved seller info', e);
      }
    }
    return DEFAULT_SELLER;
  };

  const initialIssueDate = new Date().toISOString().split('T')[0];

  const [invoice, setInvoice] = useState<InvoiceData>({
    invoiceNumber: formatInvoiceNumberFromDate(initialIssueDate),
    issueDate: initialIssueDate,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: '£',
    seller: getInitialSeller(),
    client: DEFAULT_CLIENT,
    items: [
      { id: '1', description: 'Brand Strategy & UI/UX Design Sprint', quantity: 1, rate: 2500 },
    ],
    taxRate: 0,
    discount: 0,
    discountType: 'percentage',
    notes: 'Thank you for your business! Please feel free to reach out if you have any questions regarding this invoice.',
    terms: 'Payment is due within 14 days of issue date.',
    accentColor: BRAND_ACCENT_COLOR
  });

  // Calculate totals
  const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const discountAmount = invoice.discountType === 'percentage' 
    ? (subtotal * invoice.discount) / 100 
    : invoice.discount;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * invoice.taxRate) / 100;
  const total = taxableAmount + taxAmount;

  // Handlers for Line Items
  const handleAddItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: '',
      quantity: 1,
      rate: 0
    };
    setInvoice({ ...invoice, items: [...invoice.items, newItem] });
  };

  const handleUpdateItem = (id: string, field: keyof LineItem, value: any) => {
    setInvoice({
      ...invoice,
      items: invoice.items.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    });
  };

  const handleRemoveItem = (id: string) => {
    if (invoice.items.length === 1) return;
    setInvoice({
      ...invoice,
      items: invoice.items.filter(item => item.id !== id)
    });
  };

  // Save seller info as default
  const handleSaveDefaultSeller = () => {
    localStorage.setItem(STORAGE_KEY_SELLER, JSON.stringify(invoice.seller));
    localStorage.setItem(STORAGE_KEY_COLOR, invoice.accentColor);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Reset to empty client
  const handleResetClient = () => {
    setInvoice(prev => ({
      ...prev,
      client: {
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        cityStateZip: '',
        country: ''
      }
    }));
  };

  // Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setInvoice(prev => ({
          ...prev,
          seller: { ...prev.seller, logoUrl: result }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);

    try {
      const element = previewRef.current;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${invoice.invoiceNumber || 'invoice'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (html2pdf as any)().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF export failed, fallback to print:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">InvoiceCraft</h1>
              <p className="text-xs text-slate-500">Fast, pre-populated invoice generator & PDF exporter</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDefaultSeller}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Save your current seller details as default for next time"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Defaults Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-slate-500" />
                  <span>Save Info as Default</span>
                </>
              )}
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 active:bg-sky-800 transition shadow-md shadow-sky-200 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Editor Form */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Invoice Meta */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Hash className="w-4 h-4 text-sky-600" /> Invoice Details
              </h2>
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-0.5 rounded-md">Currency: GBP (£)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  onChange={e => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={invoice.issueDate}
                  onChange={e => {
                    const newIssueDate = e.target.value;
                    setInvoice(prev => ({
                      ...prev,
                      issueDate: newIssueDate,
                      invoiceNumber: formatInvoiceNumberFromDate(newIssueDate)
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={invoice.dueDate}
                  onChange={e => setInvoice({ ...invoice, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Seller Information (Pre-populated) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-sky-600" /> Your Info (Seller)
              </h2>
              <span className="text-xs text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full font-medium">Pre-populated</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={invoice.seller.name}
                    onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, name: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Business / Company</label>
                  <input
                    type="text"
                    value={invoice.seller.businessName}
                    onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, businessName: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={invoice.seller.email}
                    onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, email: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={invoice.seller.phone}
                    onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, phone: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Street Address</label>
                <input
                  type="text"
                  value={invoice.seller.address}
                  onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, address: e.target.value } })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Town / City & Postcode</label>
                  <input
                    type="text"
                    value={invoice.seller.cityStateZip}
                    onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, cityStateZip: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">VAT Reg / Tax ID (Optional)</label>
                  <input
                    type="text"
                    value={invoice.seller.taxId}
                    onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, taxId: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment / Bank Info */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Payment / Bank Details</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Bank</label>
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={invoice.seller.bankName}
                      onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, bankName: e.target.value } })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Account Number</label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={invoice.seller.accountNumber}
                      onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, accountNumber: e.target.value } })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Sort Code</label>
                    <input
                      type="text"
                      placeholder="Sort Code"
                      value={invoice.seller.sortCode}
                      onChange={e => setInvoice({ ...invoice, seller: { ...invoice.seller, sortCode: e.target.value } })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo upload */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Company Logo</span>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {invoice.seller.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Client / Billed To Information */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <User className="w-4 h-4 text-sky-600" /> Client / Billed To
              </h2>
              <button
                onClick={handleResetClient}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                title="Clear client fields"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="Client Contact Name"
                    value={invoice.client.name}
                    onChange={e => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company / Organisation</label>
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={invoice.client.company}
                    onChange={e => setInvoice({ ...invoice, client: { ...invoice.client, company: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="client@company.co.uk"
                    value={invoice.client.email}
                    onChange={e => setInvoice({ ...invoice, client: { ...invoice.client, email: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="07000 000000"
                    value={invoice.client.phone}
                    onChange={e => setInvoice({ ...invoice, client: { ...invoice.client, phone: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street Address"
                  value={invoice.client.address}
                  onChange={e => setInvoice({ ...invoice, client: { ...invoice.client, address: e.target.value } })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Town / City & Postcode</label>
                  <input
                    type="text"
                    placeholder="City, Postcode"
                    value={invoice.client.cityStateZip}
                    onChange={e => setInvoice({ ...invoice, client: { ...invoice.client, cityStateZip: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="United Kingdom"
                    value={invoice.client.country}
                    onChange={e => setInvoice({ ...invoice, client: { ...invoice.client, country: e.target.value } })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Line Items */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-sky-600" /> Line Items
              </h2>
              <button
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {invoice.items.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Item description or service details..."
                      value={item.description}
                      onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                    />
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={invoice.items.length === 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition disabled:opacity-20 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Rate / Price</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={e => handleUpdateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Total</span>
                      <span className="text-sm font-bold text-slate-800">
                        {invoice.currency}{(item.quantity * item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tax & Discount Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={invoice.taxRate}
                  onChange={e => setInvoice({ ...invoice, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={invoice.discount}
                  onChange={e => setInvoice({ ...invoice, discount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Client Note</label>
                <textarea
                  rows={2}
                  value={invoice.notes}
                  onChange={e => setInvoice({ ...invoice, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={invoice.terms}
                  onChange={e => setInvoice({ ...invoice, terms: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Printable Invoice Preview */}
        <div className="lg:col-span-7 sticky top-24">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Live Document Preview (A4 Ratio)</span>
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Auto-updating
            </span>
          </div>

          {/* Printable Invoice Container */}
          <div 
            id="invoice-preview"
            ref={previewRef}
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 md:p-12 text-slate-800 transition-all min-h-[800px] flex flex-col justify-between"
            style={{ maxWidth: '800px', margin: '0 auto' }}
          >
            <div>
              {/* Header: Logo/Company & Invoice Title/Badge */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-8 gap-6">
                <div className="space-y-1">
                  {invoice.seller.logoUrl ? (
                    <div className="mb-3">
                      <img 
                        src={invoice.seller.logoUrl} 
                        alt="Logo" 
                        className="h-16 w-auto max-w-[280px] object-contain object-left" 
                      />
                    </div>
                  ) : (
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                      {invoice.seller.businessName || invoice.seller.name || 'Your Business'}
                    </h2>
                  )}
                  <p className="text-xs text-slate-500 font-semibold">{invoice.seller.name}</p>
                  <p className="text-xs text-slate-500">{invoice.seller.address}</p>
                  <p className="text-xs text-slate-500">{invoice.seller.cityStateZip}</p>
                  <p className="text-xs text-slate-500">{invoice.seller.email} • {invoice.seller.phone}</p>
                  {invoice.seller.taxId && (
                    <p className="text-xs text-slate-400 mt-0.5">VAT / Tax Reg: {invoice.seller.taxId}</p>
                  )}
                </div>

                <div className="text-right">
                  <span 
                    className="inline-block text-xs uppercase tracking-widest font-extrabold px-3 py-1 rounded-md text-white mb-3"
                    style={{ backgroundColor: invoice.accentColor }}
                  >
                    INVOICE
                  </span>
                  <div className="text-lg font-bold text-slate-900">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">Issued:</span> {formatDateUK(invoice.issueDate)}
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Due:</span> {formatDateUK(invoice.dueDate)}
                  </div>
                </div>
              </div>

              {/* Bill To & Payment Info Grid */}
              <div className="grid grid-cols-2 gap-8 py-8 border-b border-slate-100 text-xs">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Billed To</h3>
                  <div className="font-bold text-slate-800 text-sm">{invoice.client.name || 'Client Name'}</div>
                  {invoice.client.company && <div className="font-semibold text-slate-700">{invoice.client.company}</div>}
                  {invoice.client.address && <div className="text-slate-500 mt-0.5">{invoice.client.address}</div>}
                  {invoice.client.cityStateZip && <div className="text-slate-500">{invoice.client.cityStateZip}</div>}
                  {invoice.client.country && <div className="text-slate-500">{invoice.client.country}</div>}
                  {invoice.client.email && <div className="text-slate-500 mt-1">{invoice.client.email}</div>}
                  {invoice.client.phone && <div className="text-slate-500">{invoice.client.phone}</div>}
                </div>

                {(invoice.seller.bankName || invoice.seller.accountNumber || invoice.seller.sortCode) && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Payment Details</h3>
                    {invoice.seller.bankName && (
                      <div className="text-slate-700"><span className="font-semibold">Bank:</span> {invoice.seller.bankName}</div>
                    )}
                    {invoice.seller.accountNumber && (
                      <div className="text-slate-700"><span className="font-semibold">Account:</span> {invoice.seller.accountNumber}</div>
                    )}
                    {invoice.seller.sortCode && (
                      <div className="text-slate-700"><span className="font-semibold">Sort Code:</span> {invoice.seller.sortCode}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-6">
                <table className="w-full text-left">
                  <thead>
                    <tr 
                      className="border-b-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ borderColor: invoice.accentColor }}
                    >
                      <th className="py-3 px-2 text-slate-600">Description</th>
                      <th className="py-3 px-2 text-right text-slate-600 w-16">Qty</th>
                      <th className="py-3 px-2 text-right text-slate-600 w-24">Rate</th>
                      <th className="py-3 px-2 text-right text-slate-600 w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-2 font-medium text-slate-800">{item.description || 'Untitled Item'}</td>
                        <td className="py-3 px-2 text-right text-slate-600">{item.quantity}</td>
                        <td className="py-3 px-2 text-right text-slate-600">
                          {invoice.currency}{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-slate-800">
                          {invoice.currency}{(item.quantity * item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary / Total Section */}
              <div className="flex justify-end pt-4 pb-8 border-t border-slate-100">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">
                      {invoice.currency}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount ({invoice.discount}%):</span>
                      <span>-{invoice.currency}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {invoice.taxRate > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({invoice.taxRate}%):</span>
                      <span>+{invoice.currency}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div 
                    className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-3 border-t-2"
                    style={{ borderColor: invoice.accentColor }}
                  >
                    <span>Total Due:</span>
                    <span className="text-base" style={{ color: invoice.accentColor }}>
                      {invoice.currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: Notes and Terms */}
            <div className="pt-6 border-t border-slate-100 text-[11px] text-slate-500 space-y-2">
              {invoice.notes && (
                <div>
                  <span className="font-semibold text-slate-700">Note: </span>
                  {invoice.notes}
                </div>
              )}
              {invoice.terms && (
                <div className="text-slate-400">
                  <span className="font-semibold text-slate-500">Terms: </span>
                  {invoice.terms}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
