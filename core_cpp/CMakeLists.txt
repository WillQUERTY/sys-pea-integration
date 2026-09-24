cmake_minimum_required(VERSION 3.15)

project(PEAiCore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---- Core static library (modular sources) ----
add_library(abpoxx STATIC
    src/services/group_service.cpp
    src/services/undo_stack.cpp
    src/services/validation_queue.cpp
    src/persistence/json_persistence.cpp
    src/persistence/db_persistence.cpp
)
target_include_directories(abpoxx PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)

# Link ODBC (native on Windows, requires unixODBC on Linux)
if(WIN32)
    target_link_libraries(abpoxx PUBLIC odbc32)
else()
    target_link_libraries(abpoxx PUBLIC odbc)
endif()

# ---- CLI executable ----
add_executable(pea_cli src/pea_cli.cpp)
target_link_libraries(pea_cli PRIVATE abpoxx)

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
