/* ============================================================
   script.js — Sticky Notes
   Handles: CRUD operations, localStorage persistence,
            animations, timestamps, and UI state.
   ============================================================ */


// ── CONSTANTS ─────────────────────────────────────────────────

const STORAGE_KEY = 'stickynotes-data';   // localStorage key
const MAX_CHARS   = 500;                  // textarea character limit

// Six warm sticky-note colours (match CSS --note-1 … --note-6)
const NOTE_COLORS = [
  '#fef08a',  // yellow
  '#86efac',  // mint
  '#fdba74',  // peach
  '#a5f3fc',  // sky
  '#f9a8d4',  // blush
  '#c4b5fd',  // lavender
];

// Small tilts to give each card a hand-placed feel
const TILTS = [-2.2, -1.4, -0.6, 0.5, 1.3, 2.1];


// ── DOM REFERENCES ─────────────────────────────────────────────

const addBtn      = document.getElementById('add-btn');
const notesGrid   = document.getElementById('notes-grid');
const emptyState  = document.getElementById('empty-state');
const noteTemplate = document.getElementById('note-template');
const countNumber = document.getElementById('count-number');


// ── DATA MODEL ─────────────────────────────────────────────────

/**
 * A note object looks like:
 * {
 *   id:        string   — unique identifier (timestamp-based)
 *   text:      string   — the note's content
 *   color:     string   — hex colour
 *   tilt:      number   — rotation in degrees
 *   createdAt: string   — ISO date string
 * }
 */

// In-memory array that mirrors what's in localStorage
let notes = [];


// ── PERSISTENCE ────────────────────────────────────────────────

/** Read notes array from localStorage. Returns [] if nothing saved. */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    // Corrupted data — start fresh
    console.warn('Could not parse notes from localStorage:', err);
    return [];
  }
}

/** Write the current notes array to localStorage. */
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}


// ── NOTE CREATION ──────────────────────────────────────────────

/**
 * Generate a new note data object.
 * Colours and tilts cycle so adjacent notes don't clash.
 */
function createNoteData(text = '') {
  const index = notes.length;              // used for colour/tilt cycling
  return {
    id:        `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    color:     NOTE_COLORS[index % NOTE_COLORS.length],
    tilt:      TILTS[index % TILTS.length],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Format an ISO date string into a human-readable short form.
 * e.g. "Mar 10, 2026 · 14:32"
 */
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
    hour:  '2-digit',
    minute:'2-digit',
  });
}


// ── DOM — RENDER A SINGLE CARD ──────────────────────────────────

/**
 * Build a note card element from a note data object.
 * @param {object}  noteData   — the note's data
 * @param {boolean} animate    — whether to play the entrance animation
 * @returns {HTMLElement}
 */
function buildNoteCard(noteData, animate = false) {
  // Clone the <template> content
  const fragment = noteTemplate.content.cloneNode(true);
  const card     = fragment.querySelector('.note-card');

  // ── Apply colour & tilt via CSS custom properties ──
  card.style.setProperty('--note-bg', noteData.color);
  card.style.setProperty('--tilt', `${noteData.tilt}deg`);
  card.dataset.id = noteData.id;

  // ── Populate text area ──
  const textarea = card.querySelector('.note-text');
  textarea.value = noteData.text;

  // ── Timestamp ──
  const timeEl = card.querySelector('.note-time');
  timeEl.textContent  = formatDate(noteData.createdAt);
  timeEl.setAttribute('datetime', noteData.createdAt);

  // ── Character count ──
  const charsEl = card.querySelector('.note-chars');
  updateCharCount(charsEl, noteData.text.length);

  // ── Entrance animation class ──
  if (animate) {
    card.classList.add('is-entering');
    // Remove the class once animation ends so hover transitions work cleanly
    card.addEventListener('animationend', () => {
      card.classList.remove('is-entering');
    }, { once: true });
  }

  // ── EVENTS ──

  // Save on every keystroke
  textarea.addEventListener('input', () => {
    const note = notes.find(n => n.id === noteData.id);
    if (note) {
      note.text = textarea.value;
      saveToStorage();
    }
    updateCharCount(charsEl, textarea.value.length);
  });

  // Delete button
  const deleteBtn = card.querySelector('.note-delete');
  deleteBtn.addEventListener('click', () => deleteNote(noteData.id, card));

  return card;
}

/**
 * Update the character-count display and add/remove warning class.
 * @param {HTMLElement} el      — the .note-chars span
 * @param {number}      length  — current text length
 */
function updateCharCount(el, length) {
  el.textContent = `${length} / ${MAX_CHARS}`;
  el.classList.toggle('warn', length >= MAX_CHARS - 30);
}


// ── DOM — FULL RENDER ───────────────────────────────────────────

/**
 * Render all notes in the `notes` array into the grid.
 * Called once on page load.
 */
function renderAllNotes() {
  notesGrid.innerHTML = '';                // clear grid

  notes.forEach(noteData => {
    const card = buildNoteCard(noteData, false);
    notesGrid.appendChild(card);
  });

  updateUI();
}


// ── NOTE OPERATIONS ─────────────────────────────────────────────

/** Add a brand-new blank note, render it, and focus its textarea. */
function addNote() {
  const noteData = createNoteData('');
  notes.push(noteData);
  saveToStorage();

  // Build card and animate it in
  const card = buildNoteCard(noteData, true);
  notesGrid.prepend(card);          // new notes appear at the top-left

  // Auto-focus the textarea so the user can type immediately
  card.querySelector('.note-text').focus();

  updateUI();
}

/**
 * Animate a card out, then remove it from the DOM and data.
 * @param {string}      id    — note ID
 * @param {HTMLElement} card  — the card element
 */
function deleteNote(id, card) {
  // Play the exit animation
  card.classList.add('is-leaving');

  // After animation completes, actually remove the card
  card.addEventListener('animationend', () => {
    card.remove();

    // Remove from data and persist
    notes = notes.filter(n => n.id !== id);
    saveToStorage();

    updateUI();
  }, { once: true });
}


// ── UI STATE ────────────────────────────────────────────────────

/**
 * Keep the note count badge and empty-state visibility in sync
 * with the current notes array length.
 */
function updateUI() {
  const count = notes.length;
  countNumber.textContent = count;

  // Show/hide empty state
  if (count === 0) {
    emptyState.classList.remove('hidden');
    emptyState.removeAttribute('aria-hidden');
  } else {
    emptyState.classList.add('hidden');
    emptyState.setAttribute('aria-hidden', 'true');
  }
}


// ── EVENT LISTENERS ─────────────────────────────────────────────

// "Add Note" button
addBtn.addEventListener('click', addNote);

// Keyboard shortcut: Ctrl/Cmd + Enter → add note
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    addNote();
  }
});


// ── INITIALISE ──────────────────────────────────────────────────

/**
 * On page load:
 *  1. Read saved notes from localStorage
 *  2. Render them all into the grid
 *  3. Sync UI state (count badge, empty state)
 */
function init() {
  notes = loadFromStorage();
  renderAllNotes();
}

init();
