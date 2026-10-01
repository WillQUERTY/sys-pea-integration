from backend.app import repository
from backend.app.repository import abpoxx_pybind as pb

def test_membership_ram_crud_multilist_and_undo():
    # Reset state
    for g in pb.list_groups():
        pb.delete_group(g.id)
    for r in pb.list_researchers():
        pb.delete_researcher(r.id)
    pb.undo_clear()

    grp = pb.Group()
    grp.name = "Grupo Test"
    grp.external_code = "GT1"
    g = pb.create_group(grp)

    res = pb.Researcher()
    res.first_names = "Ana"
    res.last_names = "Perez"
    res.external_code = "RES1"
    r = pb.create_researcher(res)
    gid, rid = g.id, r.id

    # 1. Add member with role and dates
    repository.add_member_to_group(gid, rid, "Director", "2020-01", "2024-12")
    det = repository.get_group_members_detailed(gid)
    assert len(det) == 1
    assert det[0]["role"] == "Director"
    assert det[0]["start_date"] == "2020-01"
    assert det[0]["end_date"] == "2024-12"

    # 2. Check multilista traversal
    groups = pb.groups_of_researcher(rid)
    assert groups == [gid]

    # 3. Update member
    repository.update_member(gid, rid, "Co-Director", "2021-01", "2025-12")
    det = repository.get_group_members_detailed(gid)
    assert det[0]["role"] == "Co-Director"
    assert det[0]["start_date"] == "2021-01"
    assert det[0]["end_date"] == "2025-12"

    # 4. Undo update
    res = repository.undo_perform()
    assert res["status"] == "success"
    det = repository.get_group_members_detailed(gid)
    assert det[0]["role"] == "Director"
    assert det[0]["start_date"] == "2020-01"
    assert det[0]["end_date"] == "2024-12"

    # 5. Remove member and check unlinking
    repository.remove_member_from_group(gid, rid)
    assert len(repository.get_group_members_detailed(gid)) == 0
    assert pb.groups_of_researcher(rid) == []

    # 6. Undo unlink restores role and dates
    res = repository.undo_perform()
    assert res["status"] == "success"
    det = repository.get_group_members_detailed(gid)
    assert len(det) == 1
    assert det[0]["role"] == "Director"
    assert det[0]["start_date"] == "2020-01"
    assert det[0]["end_date"] == "2024-12"
    assert pb.groups_of_researcher(rid) == [gid]

    # 7. Delete researcher cleans up memberships in groups
    pb.delete_researcher(rid)
    assert len(pb.members_of_group(gid)) == 0
