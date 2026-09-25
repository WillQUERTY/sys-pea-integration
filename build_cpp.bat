@echo off
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
set "PATH=%PATH%;C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin"
cd /d C:\repos\sys_pea_integration\core_cpp
if not exist build2 mkdir build2
cd build2
cmake -Dpybind11_DIR="C:\Users\Chick\AppData\Local\Programs\Python\Python312\Lib\site-packages\pybind11\share\cmake\pybind11" ..
cmake --build . --config Release
copy /Y Release\abpoxx_pybind*.pyd ..\..\backend\app\abpoxx_pybind.pyd
