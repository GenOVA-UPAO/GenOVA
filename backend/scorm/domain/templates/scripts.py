def build_scorm_js(preferred_version: str = "1.2") -> str:
    """Runtime SCORM del shell: `window.GenovaScorm`.

    Busca la API de SCORM 2004 (`API_1484_11`) y la de SCORM 1.2 (`API`) en la
    cadena de ventanas padre/opener; prueba primero la de `preferred_version`
    ("1.2" o "2004"). Sin API, todas las llamadas son no-op (devuelven false/'').

    app.js habla el modelo de datos 1.2 (`cmi.core.*`); con una API 2004 se
    traduce aquí: lesson_status → cmi.completion_status/cmi.success_status,
    score → cmi.score.* (+ scaled), session_time → duración ISO 8601, exit '' →
    'normal', y LMSFinish → Terminate.
    """
    if preferred_version not in ("1.2", "2004"):
        raise ValueError(f"Versión SCORM no soportada: {preferred_version}")
    return _SCORM_JS.replace("__PREFERRED_VERSION__", preferred_version)


_SCORM_JS = """(function (global) {
  const PREFERRED = '__PREFERRED_VERSION__'
  const API_NAMES = { '1.2': 'API', '2004': 'API_1484_11' }
  const METHODS = {
    '1.2': {
      initialize: 'LMSInitialize',
      getValue: 'LMSGetValue',
      setValue: 'LMSSetValue',
      commit: 'LMSCommit',
      finish: 'LMSFinish',
    },
    '2004': {
      initialize: 'Initialize',
      getValue: 'GetValue',
      setValue: 'SetValue',
      commit: 'Commit',
      finish: 'Terminate',
    },
  }
  let api = null
  let version = null

  function safeApi(win, name) {
    try {
      return win[name] || null
    } catch (error) {
      // Ventana de otro origen: su API no es legible, seguir con la cadena.
      return null
    }
  }

  function findApi(win, name) {
    let current = win
    let attempts = 0
    while (current && attempts < 500) {
      const found = safeApi(current, name)
      if (found) {
        return found
      }
      attempts += 1
      if (current.parent === current) {
        return null
      }
      current = current.parent
    }
    return null
  }

  function locate(name) {
    let found = findApi(global, name)
    if (!found && global.opener) {
      found = findApi(global.opener, name)
    }
    return found
  }

  function getApi() {
    if (api) {
      return api
    }
    const order = PREFERRED === '2004' ? ['2004', '1.2'] : ['1.2', '2004']
    for (let i = 0; i < order.length; i += 1) {
      const found = locate(API_NAMES[order[i]])
      if (found) {
        api = found
        version = order[i]
        return api
      }
    }
    return null
  }

  function rawCall(method, args) {
    const handle = getApi()
    const name = handle && METHODS[version][method]
    if (!name || typeof handle[name] !== 'function') {
      return null
    }
    try {
      return handle[name].apply(handle, args)
    } catch (error) {
      return null
    }
  }

  function call(method, args) {
    const result = rawCall(method, args)
    return result === true || result === 'true'
  }

  // --- Traducción del modelo de datos 1.2 (cmi.core.*) a SCORM 2004 ---

  function toIsoDuration(value) {
    // HHHH:MM:SS.SS -> PT#H#M#S
    const match = /^(\\d+):(\\d{2}):(\\d{2}(?:\\.\\d+)?)$/.exec(String(value))
    if (!match) {
      return 'PT0S'
    }
    return 'PT' + Number(match[1]) + 'H' + Number(match[2]) + 'M' + Number(match[3]) + 'S'
  }

  function set2004(element, value) {
    return call('setValue', [element, String(value)])
  }

  function setValue2004(element, value) {
    switch (element) {
      case 'cmi.core.lesson_status':
        if (value === 'passed' || value === 'failed') {
          set2004('cmi.success_status', value)
          return set2004('cmi.completion_status', 'completed')
        }
        if (value === 'completed' || value === 'incomplete') {
          return set2004('cmi.completion_status', value)
        }
        return set2004('cmi.completion_status', 'unknown')
      case 'cmi.core.score.raw': {
        const raw = Number(value)
        if (Number.isFinite(raw)) {
          set2004('cmi.score.scaled', Math.max(-1, Math.min(1, raw / 100)))
        }
        return set2004('cmi.score.raw', value)
      }
      case 'cmi.core.score.min':
        return set2004('cmi.score.min', value)
      case 'cmi.core.score.max':
        return set2004('cmi.score.max', value)
      case 'cmi.core.session_time':
        return set2004('cmi.session_time', toIsoDuration(value))
      case 'cmi.core.exit':
        return set2004('cmi.exit', value === '' ? 'normal' : value)
      case 'cmi.core.lesson_location':
        return set2004('cmi.location', value)
      default:
        return set2004(element, value)
    }
  }

  function getValue2004(element) {
    if (element === 'cmi.core.lesson_status') {
      const status = rawCall('getValue', ['cmi.completion_status']) || ''
      return status === 'unknown' ? 'not attempted' : status
    }
    if (element === 'cmi.core.lesson_location') {
      return rawCall('getValue', ['cmi.location']) || ''
    }
    return rawCall('getValue', [element]) || ''
  }

  function initialize() {
    return call('initialize', [''])
  }

  function getValue(element) {
    if (!getApi()) {
      return ''
    }
    if (version === '2004') {
      return getValue2004(element)
    }
    return rawCall('getValue', [element]) || ''
  }

  function setValue(element, value) {
    if (!getApi()) {
      return false
    }
    if (version === '2004') {
      return setValue2004(element, String(value))
    }
    return call('setValue', [element, String(value)])
  }

  function commit() {
    return call('commit', [''])
  }

  function finish() {
    return call('finish', [''])
  }

  global.GenovaScorm = {
    initialize,
    getValue,
    setValue,
    commit,
    finish,
    version: function () {
      getApi()
      return version
    },
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
  const completed = {}
  const startedAt = Date.now()
  let finished = false

  function saveTime() {
    const cs = Math.max(0, Math.round((Date.now() - startedAt) / 10))
    const hours = Math.min(9999, Math.floor(cs / 360000))
    const minutes = Math.floor(cs / 6000) % 60
    const seconds = Math.floor(cs / 100) % 60
    const pad = (v, n) => String(v).padStart(n, '0')
    window.GenovaScorm.setValue('cmi.core.session_time',
      pad(hours, 4) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(cs % 100, 2))
  }

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
    }
  }

  function markComplete() {
    if (xapi) { xapi.completed() }
    if (!initialized) {
      statusNode.textContent = 'OVA completado (modo vista previa).'
      return
    }
    window.GenovaScorm.setValue('cmi.core.lesson_status', 'completed')
    const scores = Object.values(completed)
    const score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100
    window.GenovaScorm.setValue('cmi.core.score.min', '0')
    window.GenovaScorm.setValue('cmi.core.score.max', '100')
    window.GenovaScorm.setValue('cmi.core.score.raw', score)
    saveTime()
    window.GenovaScorm.commit()
    statusNode.textContent = 'Estado LMS: completado y guardado.'
  }

  function maybeComplete() {
    // Visitar una pestaña no demuestra completar una interacción.
    if (tabs.length > 1 && Object.keys(completed).length >= tabs.length) {
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

  // Los recursos están en sandbox sin allow-same-origin. Su origin es null:
  // autenticar por la ventana del iframe activo, no por event.origin.
  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow || event.data?.type !== 'genova-resource-completed') return
    const raw = Number(event.data.score)
    if (!Number.isFinite(raw)) return
    completed[frame.getAttribute('src')] = Math.max(0, Math.min(100, raw))
    maybeComplete()
  })

  window.addEventListener('beforeunload', function () {
    if (xapi) { xapi.terminated() }
    if (initialized && !finished) {
      finished = true
      saveTime()
      window.GenovaScorm.setValue('cmi.core.exit',
        window.GenovaScorm.getValue('cmi.core.lesson_status') === 'completed' ? '' : 'suspend')
      window.GenovaScorm.commit()
      window.GenovaScorm.finish()
    }
  })

  maybeComplete()
})
"""
