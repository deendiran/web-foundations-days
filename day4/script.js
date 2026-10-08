// 1. Select all required DOM elements

const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// 2. Function to update counters and styling classes
function updateCounts() {
    const text = noteText.value;
    const chars = text.length;

    // Count words by trimming and splitting on whitespace
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

    // Display the counters in the DOM
    charCount.textContent = `Characters: ${chars}`;
    wordCount.textContent = `Words: ${words}`;

    // Apply warning (> 180) and over (> 200) classes to highlight the text
    if (chars > 200) {
        console.log("Character limit exceeded");
        charCount.classList.add("over");
        charCount.classList.remove("warning");
    } else if (chars > 180) {
        console.log("Character limit approaching");
        charCount.classList.add("warning");
        charCount.classList.remove("over");
    } else {
        console.log("Character limit is good");
        charCount.classList.remove("over", "warning");
    }
}


// 3. Clear functionality: reset input, counters and draft storage

function clearAll() {
    noteText.value = "";
    charCount.textContent = "Characters: 0";
    wordCount.textContent = "Words: 0";
    localStorage.removeItem("noteDraft");

    updateCounts();
}

// 4. Theme handling helper
function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "Light Mode";
    } else {
        document.body.classList.remove("dark");
        themeToggle.textContent = "Dark Mode";
    }
    localStorage.setItem("noteTheme", theme);
}

// 5. Event Listeners
// Text input: update counts and save draft
noteText.addEventListener("input", () => {
    updateCounts();
    localStorage.setItem("noteDraft", noteText.value);
});

// Escape key inside textarea clears it
noteText.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        clearAll();
    }
});

// Clear button: call clearAll - clears everything 
clearBtn.addEventListener("click", clearAll);

// Theme toggle button
themeToggle.addEventListener("click", () => {
    const isCurrentlyDark = document.body.classList.contains("dark");
    applyTheme(isCurrentlyDark ? "light" : "dark");
});

// 6. Initialization on page load
function init() {
    // Restore saved theme (defaults to light)
    const savedTheme = localStorage.getItem("noteTheme") || "light";
    applyTheme(savedTheme);
    
    // Restore saved draft
    const savedDraft = localStorage.getItem("noteDraft") || "";
    if (savedDraft !== null) {
        noteText.value = savedDraft;
        
    }
    
    // Initial count update
    updateCounts();
}

// Call init when the page loads
document.addEventListener("DOMContentLoaded", init);
