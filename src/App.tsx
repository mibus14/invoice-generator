import './index.css'
import { useState } from 'react'
import type { Invoice, InvoiceItem } from './types'
import { Plus, Trash2, FileText, Download, Eye, ArrowLeft, History } from 'lucide-react'
import { jsPDF } from 'jspdf'

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const KEY = 'invoices_history'

const loadHistory = (): Invoice[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function calcTotals(items: InvoiceItem[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const tax = subtotal * (taxRate / 100)
  return { subtotal, tax, total: subtotal + tax }
}

export default function App() {
  const [view, setView] = useState<'form' | 'preview' | 'history'>('form')
  const [history, setHistory] = useState<Invoice[]>(loadHistory)
  const [invoice, setInvoice] = useState<Partial<Invoice>>({
    number: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    taxRate: 16,
    items: [{ id: id(), description: '', qty: 1, price: 0 }],
  })

  const items = (invoice.items || []) as InvoiceItem[]
  const { subtotal, tax, total } = calcTotals(items, invoice.taxRate || 0)

  function setField(k: string, v: unknown) { setInvoice(p => ({ ...p, [k]: v })) }

  function addItem() {
    setField('items', [...items, { id: id(), description: '', qty: 1, price: 0 }])
  }

  function updateItem(itemId: string, k: string, v: string | number) {
    setField('items', items.map(i => i.id === itemId ? { ...i, [k]: v } : i))
  }

  function removeItem(itemId: string) {
    setField('items', items.filter(i => i.id !== itemId))
  }

  function saveAndPreview() {
    const inv: Invoice = { ...invoice as Invoice, id: id(), createdAt: new Date().toISOString() }
    const updated = [inv, ...history.slice(0, 19)]
    setHistory(updated)
    localStorage.setItem(KEY, JSON.stringify(updated))
    setView('preview')
  }

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(22); doc.setFont('helvetica', 'bold')
    doc.text('FACTURA / COTIZACIÓN', 20, 25)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text(`No: ${invoice.number || ''}`, 20, 38)
    doc.text(`Fecha: ${invoice.date || ''}`, 20, 46)
    doc.setFont('helvetica', 'bold'); doc.text('Cliente:', 20, 60)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.clientName || '', 20, 68)
    doc.text(invoice.clientEmail || '', 20, 76)
    doc.text(invoice.clientAddress || '', 20, 84)
    // Table header
    let y = 100
    doc.setFont('helvetica', 'bold'); doc.setFillColor(30, 41, 59); doc.rect(20, y - 6, 170, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text('Descripción', 22, y); doc.text('Cant.', 120, y); doc.text('Precio', 140, y); doc.text('Total', 165, y)
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal')
    items.forEach(item => {
      y += 10
      doc.text(item.description, 22, y)
      doc.text(String(item.qty), 122, y)
      doc.text(`$${item.price.toLocaleString()}`, 140, y)
      doc.text(`$${(item.qty * item.price).toLocaleString()}`, 165, y)
    })
    y += 15
    doc.line(100, y, 190, y)
    y += 8; doc.text(`Subtotal: $${subtotal.toLocaleString()}`, 120, y)
    y += 8; doc.text(`IVA (${invoice.taxRate}%): $${tax.toLocaleString()}`, 120, y)
    y += 8; doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text(`TOTAL: $${total.toLocaleString()}`, 120, y)
    if (invoice.notes) {
      y += 20; doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(`Notas: ${invoice.notes}`, 20, y)
    }
    doc.save(`${invoice.number || 'factura'}.pdf`)
  }

  if (view === 'history') return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('form')} className="text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
          <h1 className="text-white font-bold text-xl">Historial de facturas</h1>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-16 text-slate-500"><FileText size={40} className="mx-auto mb-3 opacity-30" /><p>Sin facturas guardadas</p></div>
        ) : (
          <div className="space-y-3">
            {history.map(inv => {
              const t = calcTotals(inv.items, inv.taxRate)
              return (
                <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{inv.number} — {inv.clientName}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{inv.date} · {inv.items.length} items</p>
                  </div>
                  <span className="text-green-400 font-bold text-sm">${t.total.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  if (view === 'preview') return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('form')} className="text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
          <h1 className="text-white font-bold text-xl">Vista previa</h1>
          <button onClick={exportPDF} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium">
            <Download size={15} /> Exportar PDF
          </button>
        </div>
        <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-xl">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">FACTURA</h2>
              <p className="text-slate-500 text-sm">#{invoice.number}</p>
              <p className="text-slate-500 text-sm">{invoice.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900">{invoice.clientName}</p>
              <p className="text-slate-500 text-sm">{invoice.clientEmail}</p>
              <p className="text-slate-500 text-sm">{invoice.clientAddress}</p>
            </div>
          </div>
          <table className="w-full mb-6 text-sm">
            <thead><tr className="bg-slate-100 text-left">
              <th className="px-3 py-2 rounded-l">Descripción</th>
              <th className="px-3 py-2">Cant.</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2 rounded-r text-right">Total</th>
            </tr></thead>
            <tbody>{items.map(i => (
              <tr key={i.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{i.description}</td>
                <td className="px-3 py-2">{i.qty}</td>
                <td className="px-3 py-2">${i.price.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-medium">${(i.qty * i.price).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IVA ({invoice.taxRate}%)</span><span>${tax.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-2">
                <span>TOTAL</span><span className="text-green-600">${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
          {invoice.notes && <p className="mt-6 text-slate-500 text-xs border-t border-slate-100 pt-4">Notas: {invoice.notes}</p>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center"><FileText size={18} className="text-white" /></div>
            <h1 className="text-white font-bold text-lg">Invoice Generator</h1>
          </div>
          <button onClick={() => setView('history')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <History size={16} /> Historial ({history.length})
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide text-slate-400">Información de la factura</h2>
          <div className="grid grid-cols-2 gap-4">
            {[['Número', 'number', 'text'], ['Fecha', 'date', 'date']].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                <input type={type} value={(invoice as Record<string, string>)[key] || ''} onChange={e => setField(key, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Client */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm uppercase tracking-wide text-slate-400 font-semibold mb-4">Datos del cliente</h2>
          <div className="space-y-3">
            {[['Nombre', 'clientName'], ['Email', 'clientEmail'], ['Dirección', 'clientAddress']].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                <input value={(invoice as Record<string, string>)[key] || ''} onChange={e => setField(key, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wide text-slate-400 font-semibold">Servicios / Productos</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300">
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 px-1">
              <span className="col-span-5">Descripción</span><span className="col-span-2">Cant.</span>
              <span className="col-span-3">Precio</span><span className="col-span-2 text-right">Total</span>
            </div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Descripción" className="col-span-5 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-500" />
                <input type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                  className="col-span-2 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-500" />
                <input type="number" min="0" value={item.price} onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                  className="col-span-3 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-500" />
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <span className="text-xs text-slate-300">${(item.qty * item.price).toLocaleString()}</span>
                  <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-1 text-sm">
            <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between items-center text-slate-400">
              <span>IVA</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="100" value={invoice.taxRate || 0} onChange={e => setField('taxRate', Number(e.target.value))}
                  className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none" />
                <span>%</span><span>${tax.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between text-white font-bold text-base"><span>TOTAL</span><span className="text-green-400">${total.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide block mb-2">Notas / Términos</label>
          <textarea value={invoice.notes || ''} onChange={e => setField('notes', e.target.value)} rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none" />
        </div>

        <div className="flex gap-3">
          <button onClick={saveAndPreview} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors">
            <Eye size={16} /> Ver factura
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors">
            <Download size={16} /> Exportar PDF
          </button>
        </div>
      </main>
    </div>
  )
}
