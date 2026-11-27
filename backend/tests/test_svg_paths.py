from scorm.domain.svg_paths import repair_svg_paths, valid_path_prefix


def test_trazado_valido_no_cambia():
    d = "M11 4h2v1.5h6V7h-1.3l2.8 6.5a3.5 3.5 0 0 1-7 0z"
    assert valid_path_prefix(d) == d
    html = f'<svg><path d="{d}"/></svg>'
    assert repair_svg_paths(html) == html


def test_numeros_compactos_y_banderas_de_arco():
    d = "M0-1.5.5.5L10,10a5 5 0 1010 0Z"
    assert valid_path_prefix(d) == d


def test_recorta_trazado_mezclado_con_texto():
    # Caso real de la Medición 2 (OVA-28): el `d` se mezcló con el párrafo siguiente.
    d = "M11 4h2v1.5h6V7h-1.3l2.8 6.5a3.5 3.5 a la trazabilidad y la transparencia.</p>\n</div>"
    html = f'<svg viewBox="0 0 24 24"><path fill="none" d="{d}"/></svg>'
    fixed = repair_svg_paths(html)
    assert 'd="M11 4h2v1.5h6V7h-1.3l2.8 6.5"' in fixed
    assert "trazabilidad" not in fixed


def test_no_toca_trazados_generados_por_js():
    html = '<script>el.innerHTML = `<path d="${d}"/>`;</script>'
    assert repair_svg_paths(html) == html


def test_trazado_sin_comando_inicial_queda_vacio():
    assert valid_path_prefix("10 20 L 5 5") == ""


def test_comillas_simples_y_mayusculas():
    html = "<PATH D='M0 0 L1 1 Lx'/>"
    assert repair_svg_paths(html) == "<PATH D='M0 0 L1 1'/>"
