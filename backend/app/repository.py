# backend/app/repository.py
# Clean Architecture Facade: Exposes all repository functions with 100% backward compatibility.
# Implementation logic is modularized under backend.app.repositories:
#   - context.py          : DB connection lifecycle, initialize, save/load, abpoxx_pybind
#   - groups.py           : ResearchGroup CRUD, members, multilist links, research lines
#   - researchers.py      : Researcher CRUD, inverse membership & authored products
#   - products.py         : Product CRUD, validation status, internal & external authors
#   - projects.py         : Project CRUD, group-project multilist links
#   - work_plans.py       : WorkPlan CRUD (T-08 multilist)
#   - catalogs.py         : Product families, subtypes, quality categories
#   - validation_queue.py : FIFO validation queue
#   - analytics.py        : Dashboard, executive group & researcher metrics, collaboration network
#   - undo.py             : LIFO undo stack operations
#   - product_filters.py  : Product search and filtering
#   - audit.py            : Conciliation import records and audit logging
#   - helpers.py          : Text normalization, string sanitization, clean DOI

import sys
import os

# Ensure the native extension can be found
sys.path.append(os.path.dirname(__file__))
import abpoxx_pybind

import logging

logger = logging.getLogger("peai.repository")

from .models import Group, Researcher, Product, Project, WorkPlan
from .repositories import context
from .repositories import *

# Module-level class hook to allow external code to get/set repository._active_connection_string seamlessly
class _RepositoryModule(sys.modules[__name__].__class__):
    @property
    def _active_connection_string(self):
        return context._active_connection_string

    @_active_connection_string.setter
    def _active_connection_string(self, value):
        context._active_connection_string = value

sys.modules[__name__].__class__ = _RepositoryModule
