# Installing the Desktop Application [Deprecated -- for 0.11.4 and below]

We have beta desktop images available for download with new releases. This is recommended if you don't want to bother with the command line. Download the latest release from [here](https://github.com/ridge-ai/ridge/releases). You can find the latest release under the `Assets` section.

## MacOS

1. Download the latest release from [here](https://github.com/ridge-ai/ridge/releases).
    - If your Mac uses one of the Silicon chips, then download the `Ridge_<version>_arm64.dmg` file. Otherwise, download the `Ridge_<version>_amd64.dmg` file.
2. Open the downloaded file and drag the Ridge app to your Applications folder.

## Windows

Make sure you meet the prerequisites for Windows installation. You can find them [here](windows_install.md#prerequisites).

1. Download the latest release from [here](https://github.com/ridge-ai/ridge/releases). You'll want the `ridge_<version>_amd64.exe` file.
2. Open the downloaded file and double click to install.

## Linux

For the Linux installation, you have to have `glibc` version 2.35 or higher. You can check your version with `ldd --version`.

1. Download the latest release from [here](https://github.com/ridge-ai/ridge/releases). You'll want the `ridge_<version>_amd64.deb` file.
2. In your downloads folder, run `sudo dpkg -i ridge_<version>_amd64.deb` to install Ridge.


# Uninstall

If you decide you want to uninstall the application, you can uninstall it like any other application on your system. For example, on MacOS, you can drag the application to the trash. On Windows, you can uninstall it from the `Add or Remove Programs` menu. On Linux, you can uninstall it with `sudo apt remove ridge`.

In addition to that, you might want to `rm -rf` the following directories:
- `~/.ridge`
- `~/.cache/gpt4all`
