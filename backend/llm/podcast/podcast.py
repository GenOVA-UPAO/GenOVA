"""Shared builder for the ENGAGE micro-podcast resource.

Embeds the Groq TTS audio as a base64 WAV data URI with play/pause/repeat
controls. Falls back to text-only with a manual completion button when the
audio cannot be generated.
"""

import base64
import html
import logging

from llm.podcast.audio_helpers import generar_audio_tts
from llm.utils.utils import SCORM_JS

logger = logging.getLogger(__name__)


def podcast_audio_b64(text: str) -> str | None:
    """Return the monologue narrated as a base64 WAV, or None if TTS fails."""
    try:
        return base64.b64encode(generar_audio_tts(text)).decode("ascii")
    except Exception as exc:
        logger.warning("Podcast TTS failed, falling back to text-only: %s", exc)
        return None


_STYLE = """<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Georgia',serif;background:#F7F9FC;color:#1a1a2e;min-height:100vh;
display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:40px;max-width:620px;width:100%;
box-shadow:0 4px 24px rgba(10,61,145,.1);border:1px solid #e1e8f7}
.tag{font-size:.8rem;color:#0A3D91;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
h2{font-size:1.8rem;margin-bottom:22px;color:#0A3D91}
.wave{display:flex;align-items:center;justify-content:center;gap:5px;height:64px;margin:18px 0}
.wave .bar{width:6px;border-radius:4px;background:#F47A20;height:14px;
animation:wave 1s ease-in-out infinite;animation-play-state:paused}
.wave.on .bar{animation-play-state:running}
.wave .bar:nth-child(2){animation-delay:.15s}.wave .bar:nth-child(3){animation-delay:.3s}
.wave .bar:nth-child(4){animation-delay:.45s}.wave .bar:nth-child(5){animation-delay:.6s}
.wave .bar:nth-child(6){animation-delay:.75s}.wave .bar:nth-child(7){animation-delay:.9s}
@keyframes wave{0%,100%{height:14px}50%{height:52px}}
.controls{display:flex;gap:10px;justify-content:center;margin:8px 0}
.btn{background:#F47A20;color:#fff;border:none;padding:12px 24px;border-radius:8px;
font-size:1rem;cursor:pointer;transition:background .2s;font-family:inherit}
.btn:hover{background:#e06918}
.btn.ghost{background:transparent;border:1px solid #F47A20;color:#F47A20}
.btn.ghost:hover{background:rgba(244,122,32,.1)}
.progress{height:6px;background:#e1e8f7;border-radius:3px;margin:14px 0 6px;cursor:pointer}
.fill{height:100%;width:0;background:#F47A20;border-radius:3px}
.monologue{font-size:1.05rem;line-height:1.85;color:#334155;border-left:3px solid #F47A20;
padding-left:18px;margin:22px 0}
.meta{color:#64748b;font-size:.85rem;text-align:center}
#status{color:#0A3D91;font-size:.9rem;text-align:center;margin-top:12px;min-height:1.2em}
</style>"""

_WAVE = '<div class="wave" id="wave">' + '<div class="bar"></div>' * 7 + "</div>"

_SCRIPT_AUDIO = """
var aud=document.getElementById('aud'),play=document.getElementById('play'),
rep=document.getElementById('repeat'),fill=document.getElementById('fill'),
track=document.getElementById('track'),cur=document.getElementById('cur'),
dur=document.getElementById('dur'),wave=document.getElementById('wave'),
status=document.getElementById('status'),done=false;
function fmt(s){s=Math.floor(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
aud.addEventListener('loadedmetadata',function(){dur.textContent=fmt(aud.duration);});
aud.addEventListener('timeupdate',function(){
fill.style.width=((aud.currentTime/aud.duration)*100||0)+'%';
cur.textContent=fmt(aud.currentTime);});
play.addEventListener('click',function(){if(aud.paused){aud.play();}else{aud.pause();}});
aud.addEventListener('play',function(){play.textContent='⏸ Pausar';wave.classList.add('on');});
aud.addEventListener('pause',function(){play.textContent='▶ Reproducir';wave.classList.remove('on');});
aud.addEventListener('ended',function(){
play.textContent='▶ Reproducir';wave.classList.remove('on');
if(!done){done=true;status.textContent='✓ Podcast escuchado';_scormComplete();}});
rep.addEventListener('click',function(){aud.currentTime=0;aud.play();});
track.addEventListener('click',function(e){
var r=track.getBoundingClientRect();
aud.currentTime=((e.clientX-r.left)/r.width)*aud.duration;});
"""

_SCRIPT_TEXT = """
document.getElementById('done').addEventListener('click',function(){
document.getElementById('status').textContent='✓ Completado';_scormComplete();});
"""


def build_podcast_html(concept: str, monologue: str, audio_b64: str | None) -> str:
    safe_concept = html.escape(concept)
    safe_monologue = html.escape(monologue).replace("\n", "<br>")
    if audio_b64:
        media = (
            '<audio id="aud" preload="auto" src="data:audio/wav;base64,' + audio_b64 + '"></audio>'
            '<div class="controls">'
            '<button class="btn" id="play">▶ Reproducir</button>'
            '<button class="btn ghost" id="repeat">↺ Repetir</button></div>'
            '<div class="progress" id="track"><div class="fill" id="fill"></div></div>'
            '<p class="meta"><span id="cur">0:00</span> / <span id="dur">0:00</span></p>'
        )
        script = _SCRIPT_AUDIO
    else:
        media = (
            '<button class="btn" id="done">He terminado de leer ✓</button>'
            '<p class="meta">El audio no está disponible — lee el monólogo.</p>'
        )
        script = _SCRIPT_TEXT

    return (
        '<!DOCTYPE html>\n<html lang="es">\n<head>'
        '<meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        "<title>Micro-Podcast · "
        + safe_concept
        + "</title>"
        + _STYLE
        + '</head>\n<body><div class="card">'
        '<p class="tag">🎙️ Micro-Podcast · Fase ENGAGE</p>'
        "<h2>"
        + safe_concept
        + "</h2>"
        + _WAVE
        + media
        + '<div class="monologue">'
        + safe_monologue
        + "</div>"
        '<p id="status"></p></div>\n<script>' + script + SCORM_JS + "</script></body></html>"
    )
