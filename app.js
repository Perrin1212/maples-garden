/* =====================================================
   MAPLE'S GARDEN
   Main Application
   ===================================================== */


/* =====================================================
   ELEMENTS
   ===================================================== */

const rabbit = document.getElementById("rabbit");

const messageBubble =
    document.getElementById("messageBubble");

const messageText =
    document.getElementById("messageText");

const heartEffect =
    document.getElementById("heartEffect");

const feedModal =
    document.getElementById("feedModal");

const memoriesScreen =
    document.getElementById("memoriesScreen");

const settingsScreen =
    document.getElementById("settingsScreen");

const memoryFileInput =
    document.getElementById("memoryFileInput");

const memoryUploadPanel =
    document.getElementById("memoryUploadPanel");

const memoryPreview =
    document.getElementById("memoryPreview");

const memoryCaption =
    document.getElementById("memoryCaption");

const memoryDate =
    document.getElementById("memoryDate");

const saveMemoryButton =
    document.getElementById("saveMemoryButton");

const cancelMemoryButton =
    document.getElementById("cancelMemoryButton");

const uploadStatus =
    document.getElementById("uploadStatus");

const memoryGallery =
    document.getElementById("memoryGallery");

const memoryCount =
    document.getElementById("memoryCount");

const emptyMemories =
    document.getElementById("emptyMemories");

const photoViewer =
    document.getElementById("photoViewer");

const viewerImage =
    document.getElementById("viewerImage");

const viewerCaption =
    document.getElementById("viewerCaption");

const visitFrequency =
    document.getElementById("visitFrequency");

const soundToggle =
    document.getElementById("soundToggle");


/* =====================================================
   STATE
   ===================================================== */

let selectedMemoryImage = null;

let memories = [];

let wanderTimer = null;

let messageTimer = null;

let nightTimer = null;

let audioContext = null;


/* =====================================================
   STORAGE
   ===================================================== */

const MEMORY_STORAGE_KEY =
    "maplesGardenMemories";

const SETTINGS_STORAGE_KEY =
    "maplesGardenSettings";


/* =====================================================
   DEFAULT SETTINGS
   ===================================================== */

const defaultSettings = {
    visitFrequency: "normal",
    sound: false
};


/* =====================================================
   LOAD SETTINGS
   ===================================================== */

function loadSettings() {

    try {

        const saved =
            localStorage.getItem(
                SETTINGS_STORAGE_KEY
            );

        if (!saved) {
            return {
                ...defaultSettings
            };
        }

        return {
            ...defaultSettings,
            ...JSON.parse(saved)
        };

    } catch (error) {

        console.warn(
            "Could not load settings:",
            error
        );

        return {
            ...defaultSettings
        };
    }
}


/* =====================================================
   SAVE SETTINGS
   ===================================================== */

function saveSettings() {

    const settings = {

        visitFrequency:
            visitFrequency.value,

        sound:
            soundToggle.checked
    };

    try {

        localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify(settings)
        );

    } catch (error) {

        console.warn(
            "Could not save settings:",
            error
        );
    }
}


/* =====================================================
   APPLY SETTINGS
   ===================================================== */

function applySettings() {

    const settings =
        loadSettings();

    visitFrequency.value =
        settings.visitFrequency;

    soundToggle.checked =
        settings.sound;
}


/* =====================================================
   LOAD MEMORIES
   ===================================================== */

function loadMemories() {

    try {

        const saved =
            localStorage.getItem(
                MEMORY_STORAGE_KEY
            );

        if (!saved) {

            memories = [];

            return;
        }

        const parsed =
            JSON.parse(saved);

        if (Array.isArray(parsed)) {

            memories = parsed;

        } else {

            memories = [];
        }

    } catch (error) {

        console.warn(
            "Could not load memories:",
            error
        );

        memories = [];
    }
}


/* =====================================================
   SAVE MEMORIES
   ===================================================== */

function saveMemories() {

    try {

        localStorage.setItem(
            MEMORY_STORAGE_KEY,
            JSON.stringify(memories)
        );

    } catch (error) {

        console.error(
            "Could not save memories:",
            error
        );

        if (uploadStatus) {

            uploadStatus.textContent =
                "The photo is too large to save in this browser.";

        }
    }
}


/* =====================================================
   DATE HELPERS
   ===================================================== */

function getTodayDate() {

    const date =
        new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatMemoryDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(
            `${value}T00:00:00`
        );

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


/* =====================================================
   HTML ESCAPE
   ===================================================== */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =====================================================
   RENDER MEMORIES
   ===================================================== */

function renderMemories() {

    memoryGallery.innerHTML = "";

    memoryCount.textContent =
        memories.length;

    if (memories.length === 0) {

        emptyMemories.style.display =
            "block";

        return;
    }

    emptyMemories.style.display =
        "none";


    memories
        .slice()
        .reverse()
        .forEach(
            (memory) => {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "memory-photo-card";


                const image =
                    document.createElement(
                        "img"
                    );

                image.className =
                    "memory-photo";

                image.src =
                    memory.image;

                image.alt =
                    memory.caption ||
                    "A memory of Maple";

                image.loading =
                    "lazy";


                image.addEventListener(
                    "click",
                    () => {

                        openPhotoViewer(
                            memory.image,
                            memory.caption
                        );

                    }
                );


                const details =
                    document.createElement(
                        "div"
                    );

                details.className =
                    "memory-photo-details";


                const date =
                    document.createElement(
                        "div"
                    );

                date.className =
                    "memory-photo-date";

                date.textContent =
                    formatMemoryDate(
                        memory.date
                    );


                const caption =
                    document.createElement(
                        "div"
                    );

                caption.className =
                    "memory-photo-caption";

                caption.textContent =
                    memory.caption ||
                    "A little moment with Maple.";


                const deleteButton =
                    document.createElement(
                        "button"
                    );

                deleteButton.className =
                    "memory-delete-button";

                deleteButton.type =
                    "button";

                deleteButton.textContent =
                    "Delete memory";


                deleteButton.addEventListener(
                    "click",
                    () => {

                        deleteMemory(
                            memory.id
                        );

                    }
                );


                details.appendChild(
                    date
                );

                details.appendChild(
                    caption
                );

                details.appendChild(
                    deleteButton
                );


                card.appendChild(
                    image
                );

                card.appendChild(
                    details
                );


                memoryGallery.appendChild(
                    card
                );

            }
        );
}


/* =====================================================
   DELETE MEMORY
   ===================================================== */

function deleteMemory(id) {

    const confirmed =
        window.confirm(
            "Delete this memory of Maple?"
        );

    if (!confirmed) {
        return;
    }

    memories =
        memories.filter(
            (memory) =>
                memory.id !== id
        );

    saveMemories();

    renderMemories();
}


/* =====================================================
   OPEN PHOTO VIEWER
   ===================================================== */

function openPhotoViewer(
    image,
    caption
) {

    viewerImage.src =
        image;

    viewerCaption.textContent =
        caption ||
        "A little moment with Maple.";

    photoViewer.classList.remove(
        "hidden"
    );
}


/* =====================================================
   CLOSE PHOTO VIEWER
   ===================================================== */

function closePhotoViewer() {

    photoViewer.classList.add(
        "hidden"
    );

    viewerImage.src = "";

    viewerCaption.textContent = "";
}


/* =====================================================
   PHOTO SELECTION
   ===================================================== */

memoryFileInput.addEventListener(
    "change",
    (event) => {

        const file =
            event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {

            uploadStatus.textContent =
                "Please choose an image.";

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            selectedMemoryImage =
                reader.result;

            memoryPreview.src =
                selectedMemoryImage;

            memoryUploadPanel.classList.remove(
                "hidden"
            );

            memoryCaption.focus();

            uploadStatus.textContent =
                "";
        };


        reader.onerror = () => {

            uploadStatus.textContent =
                "Could not read that photo.";

        };


        reader.readAsDataURL(file);

    }
);


/* =====================================================
   SAVE MEMORY
   ===================================================== */

saveMemoryButton.addEventListener(
    "click",
    () => {

        if (!selectedMemoryImage) {

            uploadStatus.textContent =
                "Choose a photo first.";

            return;
        }


        const memory = {

            id:
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 9)}`,

            image:
                selectedMemoryImage,

            caption:
                memoryCaption.value.trim(),

            date:
                memoryDate.value ||
                getTodayDate()

        };


        memories.push(memory);


        try {

            saveMemories();

            renderMemories();

            resetMemoryUpload();

            showMessage(
                "Maple will keep this little memory close. ❤️",
                3500
            );

        } catch (error) {

            uploadStatus.textContent =
                "Something went wrong saving the memory.";

        }

    }
);


/* =====================================================
   RESET MEMORY UPLOAD
   ===================================================== */

function resetMemoryUpload() {

    selectedMemoryImage =
        null;

    memoryFileInput.value =
        "";

    memoryPreview.src =
        "";

    memoryCaption.value =
        "";

    memoryDate.value =
        getTodayDate();

    uploadStatus.textContent =
        "";

    memoryUploadPanel.classList.add(
        "hidden"
    );
}


/* =====================================================
   CANCEL MEMORY
   ===================================================== */

cancelMemoryButton.addEventListener(
    "click",
    resetMemoryUpload
);


/* =====================================================
   NAVIGATION
   ===================================================== */

function setActiveNav(buttonId) {

    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(
            (button) => {

                button.classList.remove(
                    "active"
                );

            }
        );


    const button =
        document.getElementById(
            buttonId
        );

    if (button) {

        button.classList.add(
            "active"
        );
    }
}


/* =====================================================
   HOME
   ===================================================== */

document
    .getElementById("homeButton")
    .addEventListener(
        "click",
        () => {

            memoriesScreen.classList.add(
                "hidden"
            );

            settingsScreen.classList.add(
                "hidden"
            );

            feedModal.classList.add(
                "hidden"
            );

            setActiveNav(
                "homeButton"
            );

        }
    );


/* =====================================================
   MEMORIES
   ===================================================== */

document
    .getElementById("memoriesButton")
    .addEventListener(
        "click",
        () => {

            memoriesScreen.classList.remove(
                "hidden"
            );

            settingsScreen.classList.add(
                "hidden"
            );

            feedModal.classList.add(
                "hidden"
            );

            setActiveNav(
                "memoriesButton"
            );

            renderMemories();

        }
    );


document
    .getElementById("closeMemoriesButton")
    .addEventListener(
        "click",
        () => {

            memoriesScreen.classList.add(
                "hidden"
            );

            setActiveNav(
                "homeButton"
            );

        }
    );


/* =====================================================
   SETTINGS
   ===================================================== */

document
    .getElementById("settingsButton")
    .addEventListener(
        "click",
        () => {

            settingsScreen.classList.remove(
                "hidden"
            );

            memoriesScreen.classList.add(
                "hidden"
            );

            feedModal.classList.add(
                "hidden"
            );

        }
    );


document
    .getElementById("closeSettingsButton")
    .addEventListener(
        "click",
        () => {

            settingsScreen.classList.add(
                "hidden"
            );

        }
    );


/* =====================================================
   SETTINGS CHANGES
   ===================================================== */

visitFrequency.addEventListener(
    "change",
    () => {

        saveSettings();

        restartWandering();

    }
);


soundToggle.addEventListener(
    "change",
    () => {

        saveSettings();

        if (
            soundToggle.checked
        ) {

            playSoftSound();

        }

    }
);


/* =====================================================
   FEED
   ===================================================== */

document
    .getElementById("feedButton")
    .addEventListener(
        "click",
        () => {

            feedModal.classList.remove(
                "hidden"
            );

        }
    );


document
    .getElementById("closeFeedButton")
    .addEventListener(
        "click",
        () => {

            feedModal.classList.add(
                "hidden"
            );

        }
    );


/* =====================================================
   FOOD BUTTONS
   ===================================================== */

document
    .querySelectorAll(
        ".food-button"
    )
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const food =
                        button.dataset.food;

                    feedMaple(food);

                }
            );

        }
    );


/* =====================================================
   FEED MAPLE
   ===================================================== */

function feedMaple(food) {

    feedModal.classList.add(
        "hidden"
    );

    rabbit.classList.remove(
        "idle",
        "sleeping"
    );

    rabbit.classList.add(
        "happy"
    );


    const foodMessages = {

        carrot:
            "Meeps happily nibbles her carrot. 🥕",

        grass:
            "Meeps enjoys some fresh grass. 🌿",

        apple:
            "Meeps gives the apple a very curious sniff. 🍎"

    };


    showMessage(
        foodMessages[food] ||
        "Meeps enjoyed her snack. ❤️",
        3500
    );


    showHeart();


    if (
        soundToggle.checked
    ) {

        playSoftSound();

    }


    setTimeout(
        () => {

            rabbit.classList.remove(
                "happy"
            );

            rabbit.classList.add(
                "idle"
            );

        },
        1600
    );

}


/* =====================================================
   MEEPS CLICK
   ===================================================== */

rabbit.addEventListener(
    "click",
    () => {

        rabbit.classList.remove(
            "idle",
            "sleeping"
        );

        rabbit.classList.add(
            "happy"
        );


        const messages = [

            "Meeps looks up at you. 🥹",

            "A tiny curious nose twitch from Meeps. 🤎",

            "Meeps seems very happy you're here. ❤️",

            "She gives you one of her little looks.",

            "Meeps does a tiny happy hop. 🐰",

            "Hello, little Meeps. 🍁",

            "Someone wants some attention. ❤️"

        ];


        const message =
            messages[
                Math.floor(
                    Math.random() *
                    messages.length
                )
            ];


        showMessage(
            message,
            2800
        );

        showHeart();


        if (
            soundToggle.checked
        ) {

            playSoftSound();

        }


        setTimeout(
            () => {

                rabbit.classList.remove(
                    "happy"
                );

                rabbit.classList.add(
                    "idle"
                );

            },
            1600
        );

    }
);

/* =====================================================
   KEYBOARD ACCESS
   ===================================================== */

rabbit.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            rabbit.click();

        }

    }
);


/* =====================================================
   SHOW MESSAGE
   ===================================================== */

function showMessage(
    message,
    duration = 3000
) {

    clearTimeout(
        messageTimer
    );

    messageText.textContent =
        message;

    positionMessageBubble();

    messageBubble.classList.remove(
        "hidden"
    );


    messageTimer =
        setTimeout(
            () => {

                messageBubble.classList.add(
                    "hidden"
                );

            },
            duration
        );
}


/* =====================================================
   POSITION MESSAGE
   ===================================================== */

function positionMessageBubble() {

    const rabbitRect =
        rabbit.getBoundingClientRect();

    const gardenRect =
        document
            .querySelector(".garden")
            .getBoundingClientRect();


    const x =
        rabbitRect.left -
        gardenRect.left +
        rabbitRect.width / 2;


    const y =
        rabbitRect.top -
        gardenRect.top -
        12;


    messageBubble.style.left =
        `${x}px`;

    messageBubble.style.top =
        `${y}px`;
}


/* =====================================================
   HEART EFFECT
   ===================================================== */

function showHeart() {

    heartEffect.classList.remove(
        "hidden"
    );


    const rabbitRect =
        rabbit.getBoundingClientRect();

    const gardenRect =
        document
            .querySelector(".garden")
            .getBoundingClientRect();


    const x =
        rabbitRect.left -
        gardenRect.left +
        rabbitRect.width / 2;


    const y =
        rabbitRect.top -
        gardenRect.top;


    heartEffect.style.left =
        `${x}px`;

    heartEffect.style.top =
        `${y}px`;


    heartEffect.style.animation =
        "none";


    void heartEffect.offsetWidth;


    heartEffect.style.animation =
        "";


    setTimeout(
        () => {

            heartEffect.classList.add(
                "hidden"
            );

        },
        1250
    );
}


/* =====================================================
   SAFE MAPLE MOVEMENT
   ===================================================== */

function moveMaple() {

    const garden =
        document.querySelector(
            ".garden"
        );


    if (!garden) {
        return;
    }


    const gardenRect =
        garden.getBoundingClientRect();


    const rabbitWidth =
        rabbit.offsetWidth ||
        112;


    const rabbitHeight =
        rabbit.offsetHeight ||
        125;


    const paddingX =
        25;

    const paddingTop =
        90;

    const paddingBottom =
        105;


    const minX =
        paddingX +
        rabbitWidth / 2;


    const maxX =
        Math.max(
            minX,
            gardenRect.width -
            paddingX -
            rabbitWidth / 2
        );


    const minY =
        paddingTop +
        rabbitHeight / 2;


    const maxY =
        Math.max(
            minY,
            gardenRect.height -
            paddingBottom -
            rabbitHeight / 2
        );


    const x =
        minX +
        Math.random() *
        (maxX - minX);


    const y =
        minY +
        Math.random() *
        (maxY - minY);


    rabbit.style.left =
        `${x}px`;

    rabbit.style.top =
        `${y}px`;


    setTimeout(
        positionMessageBubble,
        1700
    );

}


/* =====================================================
   WANDERING INTERVAL
   ===================================================== */

function getWanderDelay() {

    const frequency =
        visitFrequency.value;


    if (frequency === "off") {

        return null;
    }


    if (frequency === "often") {

        return 8000 +
            Math.random() * 7000;
    }


    if (frequency === "rare") {

        return 30000 +
            Math.random() * 20000;
    }


    return 16000 +
        Math.random() * 12000;
}


/* =====================================================
   START WANDERING
   ===================================================== */

function startWandering() {

    clearTimeout(
        wanderTimer
    );


    const delay =
        getWanderDelay();


    if (delay === null) {
        return;
    }


    wanderTimer =
        setTimeout(
            () => {

                moveMaple();

                startWandering();

            },
            delay
        );
}


/* =====================================================
   RESTART WANDERING
   ===================================================== */

function restartWandering() {

    clearTimeout(
        wanderTimer
    );

    startWandering();
}


/* =====================================================
   NIGHT MODE
   ===================================================== */

function updateNightMode() {

    const hour =
        new Date().getHours();


    const isNight =
        hour >= 20 ||
        hour < 6;


    document.body.classList.toggle(
        "night",
        isNight
    );

}


/* =====================================================
   START NIGHT CLOCK
   ===================================================== */

function startNightClock() {

    updateNightMode();


    clearInterval(
        nightTimer
    );


    nightTimer =
        setInterval(
            updateNightMode,
            60000
        );

}


/* =====================================================
   SOFT SOUND
   ===================================================== */

function playSoftSound() {

    if (
        !soundToggle.checked
    ) {
        return;
    }


    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }


        if (
            audioContext.state ===
            "suspended"
        ) {

            audioContext.resume();

        }


        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();


        oscillator.type =
            "sine";

        oscillator.frequency.value =
            520;


        gain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.035,
            audioContext.currentTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.22
        );


        oscillator.connect(
            gain
        );

        gain.connect(
            audioContext.destination
        );


        oscillator.start();

        oscillator.stop(
            audioContext.currentTime +
            0.25
        );

    } catch (error) {

        console.warn(
            "Sound unavailable:",
            error
        );

    }

}


/* =====================================================
   PHOTO VIEWER EVENTS
   ===================================================== */

document
    .getElementById("closePhotoViewer")
    .addEventListener(
        "click",
        closePhotoViewer
    );


photoViewer.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            photoViewer
        ) {

            closePhotoViewer();

        }

    }
);


/* =====================================================
   ESCAPE KEY
   ===================================================== */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key !== "Escape"
        ) {
            return;
        }


        feedModal.classList.add(
            "hidden"
        );

        photoViewer.classList.add(
            "hidden"
        );

        memoriesScreen.classList.add(
            "hidden"
        );

        settingsScreen.classList.add(
            "hidden"
        );

    }
);


/* =====================================================
   WINDOW RESIZE
   ===================================================== */

window.addEventListener(
    "resize",
    () => {

        positionMessageBubble();

    }
);


/* =====================================================
   INITIALISE
   ===================================================== */

function initialiseApp() {

    applySettings();

    loadMemories();

    renderMemories();

    memoryDate.value =
        getTodayDate();

    startNightClock();

    startWandering();

}


/* =====================================================
   START
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initialiseApp
);