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
