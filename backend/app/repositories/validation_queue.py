import logging
import abpoxx_pybind

logger = logging.getLogger("peai.repository")


def vq_enqueue(product_id: int, assigned_to: str = ""):
    from .. import repository
    item = abpoxx_pybind.ValidationQueueItem()
    item.product_id = product_id
    item.assigned_to = assigned_to
    abpoxx_pybind.vq_enqueue(item)
    if repository._active_connection_string:
        if not abpoxx_pybind.vq_enqueue_db(repository._active_connection_string, product_id, assigned_to):
            logger.error("Error sincronizando ValidationQueueItem a BD")
            raise RuntimeError("Error sincronizando ValidationQueueItem a BD")


def vq_front():
    return abpoxx_pybind.vq_front()


def vq_dequeue():
    return abpoxx_pybind.vq_dequeue()


def vq_list():
    return abpoxx_pybind.vq_list()


def vq_size() -> int:
    return abpoxx_pybind.vq_size()


def vq_pending_count() -> int:
    return abpoxx_pybind.vq_pending_count()


def vq_clear():
    abpoxx_pybind.vq_clear()


def vq_remove_item(item_id: int):
    """Cancela un item especifico de la cola sin procesarlo (RAM + BD)."""
    from .. import repository
    item = next((i for i in abpoxx_pybind.vq_list() if i.id == item_id), None)
    if item is None:
        raise KeyError(f"Queue item {item_id} not found")
    if not abpoxx_pybind.vq_remove(item_id):
        raise KeyError(f"Queue item {item_id} not found")
    if repository._active_connection_string:
        abpoxx_pybind.vq_cancel_db(repository._active_connection_string, item.product_id)
    return item.product_id
