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

function toggleNavMenu() {
    let menu = document.getElementById("ridge-nav-menu");
    menu.classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
document.addEventListener('click', function(event) {
    let menu = document.getElementById("ridge-nav-menu");
    let menuContainer = document.getElementById("ridge-nav-menu-container");
    let isClickOnMenu = menuContainer.contains(event.target) || menuContainer === event.target;
    if (isClickOnMenu === false && menu.classList.contains("show")) {
        menu.classList.remove("show");
    }
});

async function populateHeaderPane() {
    let userInfo = null;
    try {
        userInfo = await window.userInfoAPI.getUserInfo();
    } catch (error) {
        console.log("User not logged in");
    }

    let username = userInfo?.username ?? "?";
    let user_photo = userInfo?.photo;
    let is_active = userInfo?.is_active;
    let has_documents = userInfo?.has_documents;

    // Populate the header element with the navigation pane
    return `
        <a class="ridge-logo" href="/">
            <img class="ridge-logo" src="./assets/icons/ridge-logo-sideways-500.png" alt="Ridge"></img>
        </a>
        <nav class="ridge-nav">
            <a id="chat-nav" class="ridge-nav" href="./chat.html">💬 <span class="ridge-nav-item-text">Chat</span></a>
            ${has_documents ? '<a id="search-nav" class="ridge-nav" href="./search.html">🔎 <span class="ridge-nav-item-text">Search</span></a>' : ''}
            ${username ? `
                <div id="ridge-nav-menu-container" class="ridge-nav dropdown">
                    ${user_photo && user_photo != "None" ? `
                        <img id="profile-picture" class="${is_active ? 'circle subscribed' : 'circle'}" src="${user_photo}" alt="${username[0].toUpperCase()}" referrerpolicy="no-referrer">
                    ` : `
                        <div id="profile-picture" class="${is_active ? 'circle user-initial subscribed' : 'circle user-initial'}" alt="${username[0].toUpperCase()}">${username[0].toUpperCase()}</div>
                    `}
                    <div id="ridge-nav-menu" class="ridge-nav-dropdown-content">
                        <div class="ridge-nav-username"> ${username} </div>
                        <a id="settings-nav" class="ridge-nav" href="./config.html">⚙️ Settings</a>
                    </div>
                </div>
            ` : ''}
        </nav>
    `;
}
