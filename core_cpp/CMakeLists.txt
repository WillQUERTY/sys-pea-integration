cmake_minimum_required(VERSION 3.15)

project(PEAiCore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ---- Core static library (modular sources) ----
add_library(abpoxx STATIC
    src/services/group_service.cpp
    src/services/researcher_service.cpp
    src/services/product_service.cpp
    src/services/undo_stack.cpp
    src/services/validation_queue.cpp
    src/services/work_plan_service.cpp
    src/services/project_service.cpp
    src/services/official_indicator.cpp
    src/persistence/json_persistence.cpp
    src/persistence/json/json_common.cpp
    src/persistence/json/json_exporter.cpp
    src/persistence/json/json_loader.cpp
    src/persistence/db_persistence.cpp
    src/persistence/db/db_common.cpp
    src/persistence/db/db_loader.cpp
    src/persistence/db/db_saver.cpp
    src/persistence/db/db_entity_sync.cpp
    src/persistence/db/db_operations.cpp
    src/persistence/db/db_analytics.cpp
    src/persistence/db/db_dashboard_analytics.cpp
    src/persistence/db/db_group_analytics.cpp
    src/persistence/db/db_researcher_analytics.cpp
    src/persistence/db/db_network_analytics.cpp
    src/persistence/db/db_catalogs_analytics.cpp
)
target_include_directories(abpoxx PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)
target_include_directories(abpoxx PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Link ODBC (native on Windows, requires unixODBC on Linux)
if(WIN32)
    target_link_libraries(abpoxx PUBLIC odbc32)
else()
    target_link_libraries(abpoxx PUBLIC odbc)
endif()

# ---- CLI executable (modular sources) ----
add_executable(pea_cli
    src/pea_cli.cpp
    src/cli/cli_helpers.cpp
    src/cli/group_commands.cpp
    src/cli/researcher_commands.cpp
    src/cli/product_commands.cpp
    src/cli/plan_project_commands.cpp
    src/cli/queue_history_commands.cpp
    src/cli/structure_commands.cpp
    src/cli/interactive_repl.cpp
)
target_include_directories(pea_cli PRIVATE src)
target_link_libraries(pea_cli PRIVATE abpoxx)

# ---- Structure tests (sección 41.1) ----
enable_testing()
add_executable(pea_tests tests/test_structures.cpp)
target_link_libraries(pea_tests PRIVATE abpoxx)
add_test(NAME estructuras COMMAND pea_tests)

# ---- Tests del indicador oficial Minciencias 2024 (Fase 4) ----
# Verifican el modelo §2.2.9 → §3.10 en C++ contra el caso sintético del
# contrato (backend/tests/fixtures/indicador_oficial_caso.json).
add_executable(pea_tests_indicador tests/test_official_indicator.cpp)
target_link_libraries(pea_tests_indicador PRIVATE abpoxx)
add_test(NAME indicador_oficial COMMAND pea_tests_indicador)

# ---- Python bindings (optional) ----
find_package(pybind11 CONFIG QUIET)
if(pybind11_FOUND)
    pybind11_add_module(abpoxx_pybind pybind/bindings.cpp)
    target_link_libraries(abpoxx_pybind PRIVATE abpoxx)
    message(STATUS "pybind11 found — Python bindings will be built.")
else()
    message(STATUS "pybind11 NOT found — skipping Python bindings.")
endif()

# ---- Install rules ----
install(TARGETS abpoxx  ARCHIVE DESTINATION lib)
install(TARGETS pea_cli RUNTIME DESTINATION bin)
install(DIRECTORY include/ DESTINATION include)
