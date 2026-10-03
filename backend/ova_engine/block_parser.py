"""Parser de HTML de recursos UPAO a lista de bloques estructurados.

Extrae componentes semánticos (upao-header, p, upao-example, upao-question,
upao-comic-panel, upao-steps, upao-summary, upao-card) para su recomposición
en el editor visual sin necesidad de LLMs de texto.
"""

from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup


def _parse_headers(soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int) -> int:
    idx = start_idx
    for header in soup.find_all("upao-header"):
        idx += 1
        p = header.find("p")
        desc = p.get_text(strip=True) if p else ""
        blocks.append({
            "id": f"header-{idx}",
            "tipo": "upao-header",
            "props": {
                "title": header.get("title", ""),
                "eyebrow": header.get("eyebrow", ""),
                "description": desc,
            },
        })
    return idx


def _parse_intro_cards(soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int) -> int:
    idx = start_idx
    for intro in soup.find_all("section", class_=lambda c: c and "intro-card" in c):
        idx += 1
        p = intro.find("p", class_="card-body-text") or intro.find("p")
        h = intro.find(["h2", "h3"])
        blocks.append({
            "id": f"p-intro-{idx}",
            "tipo": "p",
            "props": {
                "text": p.get_text(strip=True) if p else "",
                "title": h.get_text(strip=True) if h else "Introducción",
            },
        })
    return idx


def _parse_node_item(node: Any, blocks: list[dict[str, Any]], n_num: str, n_title: str) -> None:
    idea_el = node.find("div", class_=lambda c: c and "sec-idea-card" in c)
    if idea_el:
        p_idea = idea_el.find("p", class_="sec-text") or idea_el.find("p")
        if p_idea:
            blocks.append({
                "id": f"p-idea-{n_num}",
                "tipo": "p",
                "props": {"text": p_idea.get_text(strip=True), "title": n_title},
            })

    ex_el = node.find("div", class_=lambda c: c and "sec-ejemplo-card" in c)
    if ex_el:
        p_ex = ex_el.find("p", class_="sec-text") or ex_el.find("p")
        if p_ex:
            blocks.append({
                "id": f"example-{n_num}",
                "tipo": "upao-example",
                "props": {"title": f"Ejemplo: {n_title}", "content": p_ex.get_text(strip=True)},
            })

    check_el = node.find("div", class_=lambda c: c and "sec-check-card" in c)
    if check_el:
        q_p = check_el.find("p", class_="sec-question") or check_el.find("p")
        rev = check_el.find("upao-reveal")
        ans_p = rev.find("p") if rev else None
        blocks.append({
            "id": f"question-{n_num}",
            "tipo": "upao-question",
            "props": {
                "prompt": q_p.get_text(strip=True) if q_p else "",
                "explanation": ans_p.get_text(strip=True) if ans_p else "",
                "choices": [],
            },
        })


def _parse_nodes(soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int) -> int:
    idx = start_idx
    for node in soup.find_all("upao-node"):
        idx += 1
        n_num = node.get("number") or node.get("data-idx") or str(idx)
        n_title = node.get("title", f"Sección {n_num}")
        _parse_node_item(node, blocks, n_num, n_title)
    return idx


def _parse_comic_panels(soup: BeautifulSoup, blocks: list[dict[str, Any]]) -> None:
    for panel in soup.find_all("upao-comic-panel"):
        p_num = panel.get("number", "1")
        img = panel.find("img")
        img_url = img.get("src") if img else None
        clone = BeautifulSoup(str(panel), "html.parser").find("upao-comic-panel")
        if clone:
            for tag in clone.find_all(["svg", "img"]):
                tag.decompose()
            dialogue = clone.get_text(strip=True)
        else:
            dialogue = panel.get_text(strip=True)
        blocks.append({
            "id": f"comic-panel-{p_num}",
            "tipo": "upao-comic-panel",
            "props": {
                "number": int(p_num) if p_num.isdigit() else 1,
                "character": panel.get("character", "Max"),
                "dialogue": dialogue,
                "bubbleSide": panel.get("bubble-side", "left"),
                "imgAlt": panel.get("img-alt", ""),
                "imageUrl": img_url,
            },
        })


def _parse_dba_panels(soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int) -> int:
    idx = start_idx
    for dba in soup.find_all("section", class_=lambda c: c and "dba-panel" in c):
        idx += 1
        p = dba.find("div", class_="dba-body")
        p_text = p.find("p").get_text(strip=True) if p and p.find("p") else ""
        blocks.append({
            "id": f"card-dba-{idx}",
            "tipo": "upao-card",
            "props": {
                "title": "Aplicación Concreta para el DBA (Oracle)",
                "text": p_text,
            },
        })
    return idx


def _parse_steps(soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int) -> int:
    idx = start_idx
    for steps in soup.find_all("upao-steps"):
        idx += 1
        items = []
        for step in steps.find_all(["upao-step", "li"]):
            items.append({
                "title": step.get("title", ""),
                "content": step.get_text(strip=True),
            })
        blocks.append({
            "id": f"steps-{idx}",
            "tipo": "upao-steps",
            "props": {"items": items},
        })
    return idx


def _parse_questions(soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int) -> int:
    idx = start_idx
    for q in soup.find_all("upao-question"):
        if q.find_parent("upao-node"):
            continue
        idx += 1
        q_num = q.get("number", str(idx))
        choices = []
        for c in q.find_all("upao-choice"):
            choices.append({
                "value": c.get("value", ""),
                "text": c.get_text(strip=True),
                "correct": c.get("correct", "false").lower() == "true",
                "feedback": c.get("feedback", ""),
            })
        blocks.append({
            "id": f"question-{q_num}",
            "tipo": "upao-question",
            "props": {
                "number": int(q_num) if q_num.isdigit() else idx,
                "prompt": q.get("prompt", ""),
                "choices": choices,
            },
        })
    return idx


def _parse_summaries(soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int) -> int:
    idx = start_idx
    for s in soup.find_all("upao-summary"):
        idx += 1
        clone = BeautifulSoup(str(s), "html.parser").find("upao-summary")
        if clone:
            for comp in clone.find_all("upao-complete"):
                comp.decompose()
            text = clone.get_text(strip=True)
        else:
            text = s.get_text(strip=True)
        blocks.append({
            "id": f"summary-{idx}",
            "tipo": "upao-summary",
            "props": {
                "title": s.get("title", "Resumen y Cierre"),
                "text": text,
            },
        })
    return idx


def _parse_standalone_paragraphs(
    soup: BeautifulSoup, blocks: list[dict[str, Any]], start_idx: int
) -> None:
    if len(blocks) > 1:
        return
    idx = start_idx
    for p in soup.find_all("p"):
        if p.find_parent(["upao-header", "upao-node", "upao-summary", "upao-question", "section"]):
            continue
        text = p.get_text(strip=True)
        if text:
            idx += 1
            blocks.append({
                "id": f"p-{idx}",
                "tipo": "p",
                "props": {"text": text},
            })


def parse_html_blocks(html: str) -> list[dict[str, Any]]:
    """Convierte el HTML de un recurso OVA en una lista plana de bloques:
    [{ "id": str, "tipo": str, "props": dict }, ...]
    """
    if not html or not html.strip():
        return []

    soup = BeautifulSoup(html, "html.parser")
    blocks: list[dict[str, Any]] = []
    idx = 0

    idx = _parse_headers(soup, blocks, idx)
    idx = _parse_intro_cards(soup, blocks, idx)
    idx = _parse_nodes(soup, blocks, idx)
    _parse_comic_panels(soup, blocks)
    idx = _parse_dba_panels(soup, blocks, idx)
    idx = _parse_steps(soup, blocks, idx)
    idx = _parse_questions(soup, blocks, idx)
    idx = _parse_summaries(soup, blocks, idx)
    _parse_standalone_paragraphs(soup, blocks, idx)

    return blocks
