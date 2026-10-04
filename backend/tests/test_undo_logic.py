import pytest
from app import repository
from app.models import Group, Researcher, Product


def setup_function():
    """Limpia la pila de undo antes de cada test."""
    repository.undo_clear()


def test_undo_validate_no_recursive_push_and_fifo_reenqueue():
    """Valida que revertir VALIDATE no genere una nueva operación en la pila

    y que re-encole en la cola FIFO si el estado previo era pending.
    """
    # 1. Crear producto de prueba
    prod = repository.create_product(
        Product(external_code="UNDOTEST_VAL_01", title="Producto Test Validación Undo"),
        skip_undo=True
    )
    assert prod.id is not None
    assert prod.validation_status == "pending"

    # Encolar en FIFO
    repository.vq_enqueue(prod.id, "tester")
    assert any(i.product_id == prod.id for i in repository.vq_list())

    # 2. Validar producto
    repository.set_product_validation(prod.id, "valid", quality_category_id=1)
    assert repository.undo_size() == 1
    # Al validarse, sale de la cola de pendientes
    assert not any(i.product_id == prod.id and i.status == "pending" for i in repository.vq_list())

    # 3. Revertir mediante Undo
    res = repository.undo_perform()
    assert res["status"] == "success"
    assert res["operation_type"] == "VALIDATE"

    # Verificar que la pila quedó VACÍA (sin bucle recursivo)
    assert repository.undo_size() == 0

    # Verificar que el producto volvió a pending
    reverted = repository.get_product(prod.id)
    assert reverted.validation_status == "pending"

    # Verificar que fue re-encolado en FIFO
    assert any(i.product_id == prod.id and i.status == "pending" for i in repository.vq_list())

    # Limpieza
    repository.delete_product(prod.id, soft=False, skip_undo=True)


def test_undo_create_group():
    """Valida que create_group registre CREATE y undo lo elimine físicamente."""
    initial_count = len(repository.list_groups())
    grp = repository.create_group(
        Group(external_code="UNDOTEST_GRP_01", name="Grupo Test Undo")
    )
    assert grp.id is not None
    assert repository.undo_size() == 1
    assert len(repository.list_groups()) == initial_count + 1

    # Deshacer creación
    res = repository.undo_perform()
    assert res["status"] == "success"
    assert res["operation_type"] == "CREATE"
    assert res["entity_type"] == "Group"
    assert repository.undo_size() == 0
    assert len(repository.list_groups()) == initial_count


def test_undo_create_researcher():
    """Valida que create_researcher registre CREATE y undo lo elimine físicamente."""
    initial_count = len(repository.list_researchers())
    res_obj = repository.create_researcher(
        Researcher(external_code="UNDOTEST_RES_01", first_names="Ana", last_names="Test")
    )
    assert res_obj.id is not None
    assert repository.undo_size() == 1
    assert len(repository.list_researchers()) == initial_count + 1

    # Deshacer creación
    res = repository.undo_perform()
    assert res["status"] == "success"
    assert res["operation_type"] == "CREATE"
    assert res["entity_type"] == "Researcher"
    assert repository.undo_size() == 0
    assert len(repository.list_researchers()) == initial_count


def test_undo_link_and_unlink_member():
    """Valida simetría de undo al vincular y desvincular un miembro a un grupo."""
    grp = repository.create_group(
        Group(external_code="UNDOTEST_LINK_G1", name="Grupo Link"),
        skip_undo=True
    )
    res = repository.create_researcher(
        Researcher(external_code="UNDOTEST_LINK_R1", first_names="Carlos", last_names="Link"),
        skip_undo=True
    )

    # 1. Vincular miembro -> debe registrar LINK_MEMBER
    repository.add_member_to_group(grp.id, res.id, role="Líder")
    assert res.id in repository.members_of_group(grp.id)
    assert repository.undo_size() == 1

    # 2. Deshacer LINK_MEMBER -> debe desvincularlo
    undo_res = repository.undo_perform()
    assert undo_res["status"] == "success"
    assert res.id not in repository.members_of_group(grp.id)
    assert repository.undo_size() == 0

    # 3. Vincular de nuevo (sin undo) y luego desvincular
    repository.add_member_to_group(grp.id, res.id, role="Investigador", skip_undo=True)
    repository.remove_member_from_group(grp.id, res.id)
    assert res.id not in repository.members_of_group(grp.id)
    assert repository.undo_size() == 1

    # 4. Deshacer UNLINK_MEMBER -> debe volver a vincularlo
    undo_res = repository.undo_perform()
    assert undo_res["status"] == "success"
    assert res.id in repository.members_of_group(grp.id)
    assert repository.undo_size() == 0

    # Limpieza
    repository.delete_group(grp.id, soft=False, skip_undo=True)
    repository.delete_researcher(res.id, soft=False, skip_undo=True)
