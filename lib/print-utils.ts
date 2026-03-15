/**
 * Utilitário de impressão via iframe oculto.
 *
 * - Sem popup blocker (iframe não é bloqueado como window.open)
 * - Sem interferência do CSS da página principal (documento isolado)
 * - Compatível com impressoras térmicas (KP-IM607, etc.)
 */
export function printHTML(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:420px;height:600px;border:none;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe)
    alert('Nao foi possivel preparar a impressao. Tente novamente.')
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const printWin = iframe.contentWindow

  const cleanup = () => {
    setTimeout(() => {
      try {
        document.body.removeChild(iframe)
      } catch (_) {
        /* already removed */
      }
    }, 2000)
  }

  const executePrint = () => {
    try {
      printWin.focus()
      printWin.print()
    } catch (e) {
      console.error('Erro ao chamar print():', e)
    }
    cleanup()
  }

  const images = doc.querySelectorAll('img')
  if (images.length === 0) {
    setTimeout(executePrint, 300)
    return
  }

  let loaded = 0
  let done = false
  const onReady = () => {
    loaded++
    if (!done && loaded >= images.length) {
      done = true
      setTimeout(executePrint, 150)
    }
  }
  images.forEach((img) => {
    if (img.complete) onReady()
    else {
      img.onload = onReady
      img.onerror = onReady
    }
  })
  setTimeout(() => {
    if (!done) {
      done = true
      executePrint()
    }
  }, 3000)
}
