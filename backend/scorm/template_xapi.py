"""xAPI / cmi5 runtime for the exported OVA.

`build_xapi_js` produces a self-contained client that activates only when the
package is launched through a cmi5/xAPI assignable unit (AU) — i.e. when the
launch URL carries `endpoint`, `actor` and either `auth` or `fetch` query
parameters (the standard cmi5 launch mechanism). Outside that context (plain
SCORM player, local preview) every method is a no-op, so the same package keeps
working as SCORM 1.2.

`build_cmi5_xml` produces the cmi5 course structure so the package can be
imported into a cmi5-capable LMS alongside the SCORM manifest.
"""

import html


def build_xapi_js() -> str:
    return """(function (global) {
  var XAPI_VERSION = '1.0.3'

  function qs() {
    var out = {}
    var q = (global.location.search || '').replace(/^\\?/, '')
    q.split('&').forEach(function (pair) {
      if (!pair) { return }
      var kv = pair.split('=')
      out[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\\+/g, ' '))
    })
    return out
  }

  var p = qs()
  var endpoint = p.endpoint
  var registration = p.registration
  var activityId = p.activityId || p.activityid
  var actor = null
  try { actor = p.actor ? JSON.parse(p.actor) : null } catch (e) { actor = null }

  // Sin parámetros de lanzamiento cmi5 => modo no-op (SCORM/preview).
  var active = !!(endpoint && actor && (p.auth || p.fetch))
  var auth = p.auth || null
  var ready = false
  var queue = []

  function headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': auth,
      'X-Experience-API-Version': XAPI_VERSION
    }
  }

  function postStatement(stmt) {
    if (!active) { return }
    if (!ready) { queue.push(stmt); return }
    try {
      var url = endpoint.replace(/\\/$/, '') + '/statements'
      global.fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(stmt) })
        .catch(function () {})
    } catch (e) { /* best-effort */ }
  }

  function flush() {
    ready = true
    var pending = queue.slice()
    queue = []
    pending.forEach(postStatement)
  }

  function stmt(verbId, verbLabel, objName) {
    var s = {
      actor: actor,
      verb: { id: verbId, display: { 'es': verbLabel, 'en-US': verbLabel } },
      object: {
        id: objName ? (activityId + '/' + encodeURIComponent(objName)) : activityId,
        definition: { name: { 'es': objName || activityId } }
      },
      timestamp: new Date().toISOString()
    }
    if (registration) { s.context = { registration: registration } }
    return s
  }

  function init() {
    if (!active) { return }
    // cmi5: si hay fetch, obtener el auth-token antes de enviar nada.
    if (p.fetch && !auth) {
      try {
        global.fetch(p.fetch, { method: 'POST' })
          .then(function (r) { return r.json() })
          .then(function (j) {
            auth = j['auth-token'] ? ('Basic ' + j['auth-token']) : auth
            flush()
            postStatement(stmt('http://adlnet.gov/expapi/verbs/initialized', 'inició', null))
          })
          .catch(function () { active = false })
      } catch (e) { active = false }
    } else {
      if (auth && auth.indexOf(' ') < 0) { auth = 'Basic ' + auth }
      flush()
      postStatement(stmt('http://adlnet.gov/expapi/verbs/initialized', 'inició', null))
    }
  }

  global.GenovaXapi = {
    experienced: function (name) {
      postStatement(stmt('http://adlnet.gov/expapi/verbs/experienced', 'experimentó', name))
    },
    completed: function () {
      postStatement(stmt('http://adlnet.gov/expapi/verbs/completed', 'completó', null))
      postStatement(stmt('http://adlnet.gov/expapi/verbs/passed', 'aprobó', null))
    },
    terminated: function () {
      postStatement(stmt('http://adlnet.gov/expapi/verbs/terminated', 'terminó', null))
    },
    active: function () { return active }
  }

  init()
})(window)
"""


def build_cmi5_xml(course_title: str, module_title: str) -> str:
    """Minimal cmi5 course structure: one block with a single AU (index.html)."""
    title = html.escape(course_title)
    module = html.escape(module_title)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<courseStructure xmlns="https://w3id.org/xapi/profiles/cmi5/v1/CourseStructure.xsd">
  <course id="https://genova.upao.edu.pe/xapi/course/genova-ova">
    <title><langstring lang="es">{title}</langstring></title>
    <description><langstring lang="es">{module}</langstring></description>
  </course>
  <au id="https://genova.upao.edu.pe/xapi/au/index"
      moveOn="Completed"
      launchMethod="OwnWindow">
    <title><langstring lang="es">{module}</langstring></title>
    <description><langstring lang="es">{module}</langstring></description>
    <url>index.html</url>
  </au>
</courseStructure>
"""
