import subprocess
import sys
import os
import shutil
from pathlib import Path


def run_command(cmd, cwd=None, auto_confirm=True):
    print(f"\n执行命令: {cmd}")
    
    if auto_confirm:
        env = os.environ.copy()
        env['PYTHONUNBUFFERED'] = '1'
        
        if 'pip install' in cmd:
            cmd = cmd + ' -q'
        
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            env=env,
            text=True
        )
    else:
        result = subprocess.run(cmd, shell=True, cwd=cwd, text=True)
    
    return result.returncode == 0


def check_python_version():
    version = sys.version_info
    print(f"Python 版本: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("错误: 需要 Python 3.7 或更高版本")
        return False
    return True


def create_virtual_env():
    venv_path = Path("venv")
    
    if venv_path.exists():
        print("虚拟环境已存在")
        return True
    
    print("\n创建虚拟环境...")
    if run_command(f'"{sys.executable}" -m venv venv'):
        print("虚拟环境创建成功")
        return True
    else:
        print("虚拟环境创建失败")
        return False


def get_venv_python():
    if sys.platform == "win32":
        return Path("venv/Scripts/python.exe")
    else:
        return Path("venv/bin/python")


def get_venv_pip():
    if sys.platform == "win32":
        return Path("venv/Scripts/pip.exe")
    else:
        return Path("venv/bin/pip")


def install_dependencies():
    print("\n安装依赖...")
    
    pip_path = get_venv_pip()
    python_path = get_venv_python()
    
    print("升级 pip...")
    run_command(f'"{python_path}" -m pip install --upgrade pip')
    
    print("安装项目依赖...")
    if run_command(f'"{pip_path}" install -r requirements.txt'):
        print("依赖安装成功")
        return True
    else:
        print("依赖安装失败，尝试逐个安装...")
        
        dependencies = [
            "pywebview>=4.0",
            "jinja2>=3.0",
            "pyinstaller>=6.0"
        ]
        
        for dep in dependencies:
            print(f"安装 {dep}...")
            if not run_command(f'"{pip_path}" install {dep}'):
                print(f"安装 {dep} 失败")
                return False
        
        print("所有依赖安装完成")
        return True


def build_executable():
    print("\n构建可执行文件...")
    
    python_path = get_venv_python()
    
    build_cmd = (
        f'"{python_path}" -m PyInstaller '
        f'--onefile '
        f'--windowed '
        f'--name "HTML_PPT_Editor" '
        f'--add-data "assets;assets" '
        f'--add-data "src;src" '
        f'--add-data "templates;templates" '
        f'--hidden-import "pywebview" '
        f'--hidden-import "jinja2" '
        f'--clean '
        f'main.py'
    )
    
    if run_command(build_cmd):
        print("\n构建成功!")
        print(f"可执行文件位置: {Path('dist/HTML_PPT_Editor.exe').absolute()}")
        return True
    else:
        print("构建失败")
        return False


def run_dev():
    print("\n启动开发模式...")
    
    python_path = get_venv_python()
    
    run_command(f'"{python_path}" main.py', auto_confirm=False)


def clean_build():
    print("\n清理构建文件...")
    
    dirs_to_remove = ['build', 'dist', '__pycache__', '*.egg-info']
    
    for dir_name in dirs_to_remove:
        for path in Path('.').glob(dir_name):
            if path.is_dir():
                shutil.rmtree(path)
                print(f"已删除: {path}")
    
    for spec_file in Path('.').glob('*.spec'):
        spec_file.unlink()
        print(f"已删除: {spec_file}")


def show_menu():
    print("\n" + "=" * 50)
    print("HTML PPT 编辑器 - 构建工具")
    print("=" * 50)
    print("\n请选择操作:")
    print("1. 安装依赖")
    print("2. 运行开发模式")
    print("3. 构建可执行文件")
    print("4. 完整构建 (安装依赖 + 构建)")
    print("5. 清理构建文件")
    print("6. 退出")
    print("-" * 50)


def main():
    os.chdir(Path(__file__).parent)
    
    if not check_python_version():
        input("\n按回车键退出...")
        return
    
    while True:
        show_menu()
        choice = input("\n请输入选项 (1-6): ").strip()
        
        if choice == '1':
            if create_virtual_env():
                install_dependencies()
        
        elif choice == '2':
            if not Path("venv").exists():
                print("虚拟环境不存在，正在创建...")
                if not create_virtual_env():
                    continue
                if not install_dependencies():
                    continue
            
            run_dev()
        
        elif choice == '3':
            if not Path("venv").exists():
                print("请先安装依赖 (选项 1)")
                continue
            
            build_executable()
        
        elif choice == '4':
            if create_virtual_env():
                if install_dependencies():
                    build_executable()
        
        elif choice == '5':
            clean_build()
        
        elif choice == '6':
            print("\n再见!")
            break
        
        else:
            print("无效选项，请重新选择")
        
        input("\n按回车键继续...")


if __name__ == '__main__':
    main()
