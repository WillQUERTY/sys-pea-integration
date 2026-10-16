"""
API v1 root router aggregator.
Includes domain routers for system, groups, plans, projects, researchers, products, imports, and analytics.
"""
from fastapi import APIRouter
from .common import _normalize_text, _reload_ram_from_db
from .routers import (
    analytics,
    groups,
    imports,
    plans,
    products,
    projects,
    researchers,
    system,
)

router = APIRouter()

router.include_router(system.router)
router.include_router(groups.router)
router.include_router(plans.router)
router.include_router(projects.router)
router.include_router(researchers.router)
router.include_router(products.router)
router.include_router(imports.router)
router.include_router(analytics.router)

__all__ = [
    "router",
    "_normalize_text",
    "_reload_ram_from_db",
]
