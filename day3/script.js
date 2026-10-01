// Day 3 Assignment: Note Management System

// Starting data structure for notes

let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

/**
 * 1. searchNotes(word)
 * Returns an array of notes whose text contains word, ignoring upper and lower case.
 */

function searchNotes(word) {
  const query = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(query));
}

/**
 * 2. longestNote()
 * Returns the note object with the most characters, or null if there are no notes.
 */

function longestNote() {
  if (notes.length === 0) {
    return null;
  } 
    return notes.reduce((longest, current) => {
        return current.text.length > longest.text.length ? current : longest;
    });
}

/**
 * 3. countByCategory()
 * Returns an object counting notes per category.
 */

function countByCategory(category) {
    const counts = {};
    for (const note of notes) {
        if (note.category === category) {
            counts[category] = (counts[category] || 0) + 1;
        }
    }
    return counts[category] || 0;
}

/**
 * 4. getSummary()
 * Returns a summary sentence like "5 notes: 2 personal, 1 work, 2 study."
 */

function getSummary() {
  const total = notes.length;
  const label = total === 1 ? "note" : "notes";
  const counts = countByCategory();
  
  const categoryDetails = Object.entries(counts)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(", ");

  return `${total} ${label}: ${categoryDetails}.`;
}

/**
 * 5. isDuplicate(text)
 * Returns true if a note with the same text already exists (ignoring case and extra spaces).
 */

function isDuplicate(text) {
    const lowerCaseText = text.toLowerCase().trim();
    return notes.some(note => note.text.toLowerCase().trim() === lowerCaseText);
}

/**
 * 6. addNote(text, category)
 * Adds a note if valid (1–200 chars, non-duplicate, allowed category).
 */

function addNote(text, category) {
  const validCategories = ["personal", "work", "study"];
  
  if (!text || text.trim().length < 1 || text.length > 200) {
    console.log("Failed to add note: Text length must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Failed to add note: Duplicate text found.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("Failed to add note: Invalid category. Must be personal, work, or study.");
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: text.trim(), category });
  return true;
}

// Function Tests & Expected Outputs

// Test searchNotes function
console.log("--- 1. Test searchNotes ---");

// Normal cases
console.log(searchNotes("milk"));
console.log(searchNotes("day 3"));
console.log(searchNotes("EMAIL"));

// Edge cases
console.log(searchNotes("nonexistent"));
console.log(searchNotes(""));
console.log(searchNotes("   "));

// Test longestNote function
console.log("\n--- 2. Test longestNote ---");

// Normal case
console.log(longestNote());

// Edge case: empty notes array
const originalNotes = [...notes];
notes = [];
console.log(longestNote());

notes = [...originalNotes];


// Test countByCategory function
console.log("\n--- 3. Test countByCategory ---");

// Normal cases
console.log(countByCategory("personal"));
console.log(countByCategory("work"));
console.log(countByCategory("study"));

// Edge case 1: No notes in the array
console.log("--- Edge case 1: No notes in the array ---");
notes = [];
console.log(countByCategory());

// Edge case 2: Counts correctly with only one note in the array
console.log("--- Edge case 2: Counts correctly with only one note in the array ---");
notes = [{ id: 1, text: "Solo note", category: "work" }];
console.log(countByCategory("work"));

notes = [...originalNotes];

// Test getSummary function
console.log("\n--- 4. Test getSummary ---");
// Normal case
console.log(getSummary());

// Edge case: formatted summary string for plural notes
notes = [{ id: 1, text: "Note 1", category: "personal" }];
console.log(getSummary());

notes = [...originalNotes];


// Test isDuplicate function
console.log("\n--- 5. Test isDuplicate ---");
// Normal cases
console.log(isDuplicate("Buy milk and bread"));

// Edge cases
console.log(isDuplicate("buy groceries"));

// Test addNote function
console.log("\n--- 6. Test addNote ---");

// Normal cases: Successfully adding notes
console.log(addNote("Go for a run", "personal"));

// Edge case 1: Rejects duplicate note
console.log(addNote("Finish the Day 3 assignment", "study"));

// Edge case 2: Rejects note with text exceeding maximum length
console.log(addNote("This is a very long note that exceeds the maximum allowed length of 200 characters. It should fail to be added to the notes array because it is too long and does not meet the requirements set forth in the addNote function.", "work"));

// Edge case 3: Rejects note with invalid category
console.log(addNote("Call mum", "invalidCategory"));

// Edge case 4: Rejects note with only whitespace   
console.log(addNote("  ", "personal"));

// =======================================
// RESULTS
// =======================================

/*
--- 1. Test searchNotes ---
[ { id: 1, text: 'Buy milk and bread', category: 'personal' } ]
[ { id: 2, text: 'Finish the Day 3 assignment', category: 'study' } ]
[
  {
    id: 3,
    text: 'Email the project report to Grace',
    category: 'work'
  }
]
[]
[
  { id: 1, text: 'Buy milk and bread', category: 'personal' },
  { id: 2, text: 'Finish the Day 3 assignment', category: 'study' },
  {
    id: 3,
    text: 'Email the project report to Grace',
    category: 'work'
  },
  { id: 4, text: 'Revise JavaScript arrays', category: 'study' },
  { id: 5, text: 'Call mum', category: 'personal' }
]
[]

--- 2. Test longestNote ---
{ id: 3, text: 'Email the project report to Grace', category: 'work' }
null

--- 3. Test countByCategory ---
2
1
2
--- Edge case 1: No notes in the array ---
0
--- Edge case 2: Counts correctly with only one note in the array ---
1

--- 4. Test getSummary ---
5 notes: .
1 note: .

--- 5. Test isDuplicate ---
true
false

--- 6. Test addNote ---
true
Failed to add note: Duplicate text found.
false
Failed to add note: Text length must be between 1 and 200 characters.
false
Failed to add note: Duplicate text found.
false
Failed to add note: Text length must be between 1 and 200 characters.
false
*/