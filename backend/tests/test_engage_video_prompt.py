from prometheus.prompts.engage_prompts import prompt_html, prompt_texto


def test_storyboard_video_prompt_explains_that_no_video_is_generated():
    script_prompt = prompt_texto(2, "redes neuronales")
    html_prompt = prompt_html(2, "redes neuronales", '{"prompt_video": "example"}')

    assert "No hay generador de video conectado" in script_prompt
    assert "un storyboard, no un video generado" in html_prompt
    assert "Simulacion de video" in html_prompt
