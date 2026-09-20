from llm.images.image_placeholder import IMG_PLACEHOLDER, resolve_image_placeholders


def test_resolve_image_placeholders_embeds_known_uri_and_falls_back_for_survivors():
    html = '<img src="__IMG_1__"><img src="__IMG_9__">'

    result = resolve_image_placeholders(html, {"__IMG_1__": "data:image/png;base64,real"})

    assert "data:image/png;base64,real" in result
    assert result.count(IMG_PLACEHOLDER) == 1
    assert "__IMG_" not in result


def test_resolve_image_placeholders_sweeps_markers_without_image_generation():
    result = resolve_image_placeholders('<img src="__IMG_42__">')

    assert result == f'<img src="{IMG_PLACEHOLDER}">'


def test_invented_comic_token_is_emptied_so_the_component_draws_its_own_slot():
    """El modelo escribe a veces img-src="image_placeholder" en vez de __IMG_N__:
    con el token la tarjeta mostraba cinco imágenes rotas."""
    html = '<upao-comic-panel number="1" img-src="image_placeholder">Escena</upao-comic-panel>'

    result = resolve_image_placeholders(html)

    assert 'img-src=""' in result
    assert "image_placeholder" not in result


def test_invented_token_in_a_plain_img_falls_back_to_the_placeholder_svg():
    result = resolve_image_placeholders('<img src="IMAGE-PLACEHOLDER.png" alt="x">')

    assert f'src="{IMG_PLACEHOLDER}"' in result
    assert "PLACEHOLDER.png" not in result


def test_real_sources_are_left_untouched():
    html = '<img src="data:image/png;base64,ok"><img src="https://cdn/x/placeholder-image.png">'

    assert resolve_image_placeholders(html) == html
