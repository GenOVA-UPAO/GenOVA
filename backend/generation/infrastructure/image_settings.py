"""Resuelve {max_images, provider, api_key} en el momento de crear el job."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session


class LlmImageSettingsResolver:
    def __init__(self, db: Session) -> None:
        self._db = db

    def resolve(
        self,
        *,
        ova_settings: dict,
        user_api_keys: dict,
        user_id: UUID,
    ) -> dict:
        from llm.images.image_settings_resolve import build_image_settings

        return build_image_settings(
            ova_settings=ova_settings,
            user_api_keys=user_api_keys,
            db=self._db,
            user_id=user_id,
        )
