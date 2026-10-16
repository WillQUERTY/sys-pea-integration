import logging
import abpoxx_pybind

logger = logging.getLogger("peai.repository.context")

# Expose InitMode
InitMode = abpoxx_pybind.InitMode

_active_connection_string: str = ""

def get_active_connection_string() -> str:
    global _active_connection_string
    return _active_connection_string

def set_active_connection_string(source: str):
    global _active_connection_string
    _active_connection_string = source

def initialize(mode: InitMode, source: str = "") -> bool:
    global _active_connection_string
    if mode == InitMode.Database:
        # Reset RAM antes de recargar: load_from_db inserta sin limpiar y
        # duplicaria las estructuras si ya habia datos en memoria.
        abpoxx_pybind.initialize(InitMode.Empty, "")
        ok = abpoxx_pybind.initialize(mode, source)
        if ok:
            _active_connection_string = source
        else:
            _active_connection_string = ""
        return ok
    else:
        _active_connection_string = ""
        return abpoxx_pybind.initialize(mode, source)

def save_to_db(connection_string: str) -> bool:
    return abpoxx_pybind.save_to_db(connection_string)

def load_from_db(connection_string: str) -> bool:
    # Reset RAM antes de recargar: el core C++ inserta sin limpiar y una
    # recarga posterior a un commit duplicaria grupos/investigadores/productos.
    abpoxx_pybind.initialize(InitMode.Empty, "")
    return abpoxx_pybind.load_from_db(connection_string)

def load_from_file(path: str) -> bool:
    return abpoxx_pybind.load_from_file(path)

def export_to_file(path: str) -> bool:
    return abpoxx_pybind.export_to_file(path)

def print_summary():
    abpoxx_pybind.print_summary()
