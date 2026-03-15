'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency, escapeHtml } from '@/lib/utils'
import { printHTML } from '@/lib/print-utils'
import { Package, Printer, X } from 'lucide-react'
import JsBarcode from 'jsbarcode'

function getBarcodeValue(product: any, variation?: any): string {
  const barcode = product?.barcode?.toString().trim()
  if (barcode) return barcode
  const sku = product?.sku?.toString().trim() || product?.id?.slice(-6) || '0'
  if (variation) {
    const c = (variation.color || '').slice(0, 2).toUpperCase()
    const s = (variation.size || '').toString().toUpperCase()
    return `${sku}-${c}${s}`.replace(/[^A-Za-z0-9-]/g, '')
  }
  return sku
}

function textoParaImpressora(texto: string): string {
  if (!texto || typeof texto !== 'string') return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim() || texto.slice(0, 30)
}

/** Gera código de barras como SVG inline (evita imagem; imprime como gráfico). Fallback: PNG. */
function getBarcodeSvg(value: string): string {
  const code = (value || '0').replace(/[^\x20-\x7E]/g, '') || '0'
  const fn =
    typeof JsBarcode === 'function'
      ? JsBarcode
      : (JsBarcode as any).default || JsBarcode
  if (!fn) return ''

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    fn(svg, code, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      margin: 4,
      fontSize: 12,
    })
    return svg.outerHTML || ''
  } catch (e) {
    console.warn('JsBarcode SVG falhou, usando PNG:', e)
  }

  try {
    const canvas = document.createElement('canvas')
    fn(canvas, code, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      margin: 4,
      fontSize: 12,
    })
    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl ? `<img src="${dataUrl}" alt="" style="max-width:100%;height:auto;display:block;margin:0 auto" />` : ''
  } catch (e2) {
    console.warn('JsBarcode PNG falhou:', e2)
    return ''
  }
}

export interface LabelItem {
  product: any
  variation?: any
  quantity: number
}

interface LabelPrintModalProps {
  products: any[]
  onClose: () => void
}

export function LabelPrintModal({ products, onClose }: LabelPrintModalProps) {
  const [items, setItems] = useState<LabelItem[]>([])
  const [labelWidthMm, setLabelWidthMm] = useState(58)
  const [labelHeightMm, setLabelHeightMm] = useState(40)

  useEffect(() => {
    const initial: LabelItem[] = []
    for (const product of products) {
      if (product.variations?.length > 0) {
        for (const v of product.variations) {
          initial.push({ product, variation: v, quantity: 1 })
        }
      } else {
        initial.push({ product, variation: undefined, quantity: 1 })
      }
    }
    setItems(initial)
  }, [products])

  const updateQuantity = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it
      )
    )
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handlePrint = () => {
    if (items.length === 0) return

    const w = labelWidthMm
    const h = labelHeightMm
    const esc = escapeHtml
    const labels: string[] = []

    items.forEach((it) => {
      for (let q = 0; q < it.quantity; q++) {
        const nome = esc(textoParaImpressora(it.product.name))
        const cor = it.variation ? esc(textoParaImpressora(it.variation.color)) : ''
        const tam = it.variation ? esc(textoParaImpressora(String(it.variation.size))) : ''
        const preco = esc(textoParaImpressora(formatCurrency(parseFloat(it.product.price?.toString() || '0'))))
        const codigo = getBarcodeValue(it.product, it.variation)
        const barcodeSvg = getBarcodeSvg(codigo)

        labels.push(`<div class="label">
  <div class="name">${nome}</div>
  ${cor || tam ? `<div class="variant">${cor}${cor && tam ? ' | ' : ''}${tam}</div>` : ''}
  <div class="price">${preco}</div>
  <div class="barcode">${
    barcodeSvg
      ? barcodeSvg
      : `<span class="no-barcode">Cod: ${esc(codigo)}</span>`
  }</div>
  <div class="code">${esc(codigo)}</div>
</div>`)
      }
    })

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Etiquetas</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:58mm auto;margin:0}
body{font-family:'Courier New',Courier,monospace;font-size:12px;padding:5px}
.label{padding:4px 0;page-break-after:always;border-bottom:1px dashed #ccc}
.label:last-child{page-break-after:auto;border-bottom:none}
.name{font-weight:bold;font-size:11px;line-height:1.3;margin-bottom:2px}
.variant{font-size:10px;color:#333;margin-bottom:2px}
.price{font-weight:bold;font-size:12px;margin-bottom:4px}
.barcode{text-align:center;margin:4px 0}
.barcode svg{max-width:100%;height:auto}
.no-barcode{font-size:10px;color:#666}
.code{text-align:center;font-size:10px;font-weight:bold;letter-spacing:1px}
</style></head><body>
${labels.join('\n')}
</body></html>`

    printHTML(html)
  }

  const totalLabels = items.reduce((s, it) => s + it.quantity, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Imprimir Etiquetas com Codigo de Barras
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-4">
            Selecione as variacoes e quantidades. O <strong>codigo de barras</strong> impresso e o mesmo que o leitor envia ao PDV.
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-4">
            Na janela de impressao: escolha a impressora <strong>KP-IM607</strong>, papel <strong>58 mm</strong> e desative &quot;Cabecalhos e rodapes&quot;.
          </p>

          <div className="flex gap-4 mb-4 text-sm">
            <label className="flex items-center gap-2">
              <span>Largura (mm):</span>
              <select
                value={labelWidthMm}
                onChange={(e) => setLabelWidthMm(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={40}>40</option>
                <option value={50}>50</option>
                <option value={58}>58</option>
                <option value={70}>70</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Altura (mm):</span>
              <select
                value={labelHeightMm}
                onChange={(e) => setLabelHeightMm(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
                <option value={60}>60</option>
              </select>
            </label>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
            {items.map((it, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">
                    {it.product.name}
                  </span>
                  {it.variation && (
                    <span className="text-gray-600">
                      {it.variation.color} - {it.variation.size}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(i, -1)}
                    className="w-7 h-7 rounded border hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">
                    {it.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(i, 1)}
                    className="w-7 h-7 rounded border hover:bg-gray-200"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhum item selecionado.
            </p>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              Total: <strong>{totalLabels}</strong> etiqueta(s)
            </p>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button
            onClick={handlePrint}
            disabled={totalLabels === 0}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir {totalLabels > 0 ? `(${totalLabels})` : ''}
          </Button>
        </div>
      </Card>
    </div>
  )
}
