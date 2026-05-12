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

  const initialized = window.GenovaScorm && window.GenovaScorm.initialize()

  if (!initialized) {
    statusNode.textContent =
      'No se detectó API LMS (modo vista previa). El contenido sigue siendo navegable.'
    return
  }

  const currentStatus = window.GenovaScorm.getValue('cmi.core.lesson_status')

  if (!currentStatus || currentStatus === 'not attempted') {
    window.GenovaScorm.setValue('cmi.core.lesson_status', 'incomplete')
    window.GenovaScorm.commit()
    statusNode.textContent = 'Estado LMS: incomplete'
  } else {
    statusNode.textContent = 'Estado LMS actual: ' + currentStatus
  }

  completeButton.addEventListener('click', function () {
    window.GenovaScorm.setValue('cmi.core.lesson_status', 'completed')
    window.GenovaScorm.setValue('cmi.core.score.raw', '100')
    window.GenovaScorm.commit()
    statusNode.textContent = 'Estado LMS: completed (guardado)'
  })

  window.addEventListener('beforeunload', function () {
    window.GenovaScorm.commit()
    window.GenovaScorm.finish()
  })
})
"""
