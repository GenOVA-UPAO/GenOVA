def build_scorm_js() -> str:
    return """(function (global) {
  let api = null

  function findApi(win) {
    let current = win
    let attempts = 0
    while (current && attempts < 500) {
      if (current.API) {
        return current.API
      }
      attempts += 1
      current = current.parent
    }
    return null
  }

  function getApi() {
    if (api) {
      return api
    }

    api = findApi(global)

    if (!api && global.opener) {
      api = findApi(global.opener)
    }

    return api
  }

  function initialize() {
    const handle = getApi()
    if (!handle) {
      return false
    }
    return handle.LMSInitialize('') === 'true'
  }

  function getValue(element) {
    const handle = getApi()
    if (!handle) {
      return ''
    }
    return handle.LMSGetValue(element)
  }

  function setValue(element, value) {
    const handle = getApi()
    if (!handle) {
      return false
    }
    return handle.LMSSetValue(element, value) === 'true'
  }

  function commit() {
    const handle = getApi()
    if (!handle) {
      return false
    }
    return handle.LMSCommit('') === 'true'
  }

  function finish() {
    const handle = getApi()
    if (!handle) {
      return false
    }
    return handle.LMSFinish('') === 'true'
  }

  global.GenovaScorm = {
    initialize,
    getValue,
    setValue,
    commit,
    finish,
  }
})(window)
"""


def build_app_js() -> str:
    return """window.addEventListener('DOMContentLoaded', function () {
  const statusNode = document.getElementById('scorm-status')
  const completeButton = document.getElementById('complete-btn')
  const frame = document.getElementById('res-frame')
  const tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'))
  const visited = {}

  const initialized = window.GenovaScorm && window.GenovaScorm.initialize()
  const xapi = window.GenovaXapi || null

  function selectTab(btn, focus) {
    tabs.forEach(function (t) {
      const isSel = t === btn
      t.setAttribute('aria-selected', isSel ? 'true' : 'false')
      t.tabIndex = isSel ? 0 : -1
    })
    if (btn) {
      frame.src = btn.getAttribute('data-src')
      frame.setAttribute('aria-label', 'Contenido: ' + btn.textContent.trim())
      const src = btn.getAttribute('data-src')
      visited[src] = true
      if (xapi) { xapi.experienced(btn.textContent.trim()) }
      if (focus) { btn.focus() }
      maybeComplete()
    }
  }

  function markComplete() {
    if (xapi) { xapi.completed() }
    if (!initialized) {
      statusNode.textContent = 'OVA completado (modo vista previa).'
      return
    }
    window.GenovaScorm.setValue('cmi.core.lesson_status', 'completed')
    window.GenovaScorm.setValue('cmi.core.score.raw', '100')
    window.GenovaScorm.commit()
    statusNode.textContent = 'Estado LMS: completado y guardado.'
  }

  function maybeComplete() {
    if (tabs.length && Object.keys(visited).length >= tabs.length) {
      markComplete()
    }
  }

  // Patrón ARIA Tabs: flechas mueven el foco, Home/End a extremos.
  function onKeydown(e) {
    const idx = tabs.indexOf(e.currentTarget)
    if (idx < 0) { return }
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next = (idx + 1) % tabs.length }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { next = (idx - 1 + tabs.length) % tabs.length }
    else if (e.key === 'Home') { next = 0 }
    else if (e.key === 'End') { next = tabs.length - 1 }
    if (next >= 0) {
      e.preventDefault()
      selectTab(tabs[next], true)
    }
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () { selectTab(btn, false) })
    btn.addEventListener('keydown', onKeydown)
  })

  if (tabs.length) { selectTab(tabs[0], false) }

  if (!initialized) {
    statusNode.textContent =
      'No se detectó API LMS (modo vista previa). El contenido sigue siendo navegable.'
  } else {
    const currentStatus = window.GenovaScorm.getValue('cmi.core.lesson_status')
    if (!currentStatus || currentStatus === 'not attempted') {
      window.GenovaScorm.setValue('cmi.core.lesson_status', 'incomplete')
      window.GenovaScorm.commit()
      statusNode.textContent = 'Progreso: en curso.'
    } else {
      statusNode.textContent = 'Progreso actual: ' + currentStatus
    }
  }

  completeButton.addEventListener('click', markComplete)

  window.addEventListener('beforeunload', function () {
    if (xapi) { xapi.terminated() }
    if (initialized) {
      window.GenovaScorm.commit()
      window.GenovaScorm.finish()
    }
  })

  maybeComplete()
})
"""
