export interface InvoiceItem {
  id: string
  description: string
  qty: number
  price: number
}

export interface Invoice {
  id: string
  number: string
  date: string
  clientName: string
  clientEmail: string
  clientAddress: string
  items: InvoiceItem[]
  taxRate: number
  notes: string
  createdAt: string
}
