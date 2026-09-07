"""Dominio puro del agregado OVA."""

from ova.domain.errors import OvaError
from ova.domain.model import Ova, OvaActor, OvaOwner

__all__ = ["Ova", "OvaActor", "OvaError", "OvaOwner"]
