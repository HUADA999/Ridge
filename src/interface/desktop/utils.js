console.log(`%c %s`, "font-family:monospace", `
 __  __     __  __     ______       __        _____      __
/\\ \\/ /    /\\ \\_\\ \\   /\\  __ \\     /\\ \\      /\\  __ \\   /\\ \\
\\ \\  _"-.  \\ \\  __ \\  \\ \\ \\/\\ \\   _\\_\\ \\     \\ \\  __ \\  \\ \\ \\
 \\ \\_\\ \\_\\  \\ \\_\\ \\_\\  \\ \\_____\\ /\\_____\\     \\ \\_\\ \\_\\  \\ \\_\\
  \\/_/\\/_/   \\/_/\\/_/   \\/_____/ \\/_____/      \\/_/\\/_/   \\/_/

Greetings traveller,

I am ✨Ridge✨, your open-source, personal AI copilot.

See my source code at https://github.com/ridge-ai/ridge
Read my operating manual at https://docs.ridge.dev
`);


window.appInfoAPI.getInfo((_, info) => {
    let ridgeVersionElement = document.getElementById("about-page-version");
    if (ridgeVersionElement) {
        ridgeVersionElement.innerHTML = `<code>${info.version}</code>`;
    }
    let ridgeTitleElement = document.getElementById("about-page-title");
    if (ridgeTitleElement) {
        ridgeTitleElement.innerHTML = '<b>Ridge for ' + (info.platform === 'win32' ? 'Windows' : info.platform === 'darwin' ? 'macOS' : 'Linux') + '</b>';
    }
});
