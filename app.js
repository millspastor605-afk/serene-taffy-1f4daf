// Set these to the public repository that contains your decks.
// DECK_FOLDER is relative to the repository root; use "" for the root.
const GITHUB_OWNER = "millspastor605-afk";
const GITHUB_REPO = "website3";
const DECK_FOLDER = "decks";

const decks = [];
let selectedDeck = 0;
let mode = "overview";
let cardIndex = 0;
let isFlipped = false;
let choiceAnswered = false;

const statusEl = document.querySelector("#status");
const deckSelect = document.querySelector("#deckSelect");
const studyArea = document.querySelector("#studyArea");
const fileInput = document.querySelector("#fileInput");
const downloadButton = document.querySelector("#downloadButton");

function setStatus(message) {
  statusEl.textContent = message;
}

function normalizeDeck(data, fallbackTitle = "Untitled deck") {
  const sourceCards = Array.isArray(data) ? data : data?.cards;

  if (!Array.isArray(sourceCards)) {
    throw new Error('Deck JSON needs a "cards" array, or can be an array of cards.');
  }

  const cards = sourceCards.map((item) => {
    const question = item.question ?? item.front ?? item.term;
    const answer = item.answer ?? item.back ?? item.definition;

    if (question == null || answer == null) return null;

    return {
      question: String(question),
      answer: String(answer),
      options: Array.isArray(item.options) ? item.options.map(String) : null
    };
  }).filter(Boolean);

  if (!cards.length) {
    throw new Error("This deck has no valid cards. Each card needs a question and answer.");
  }

  return {
    title: String(data?.title || fallbackTitle),
    cards
  };
}

function addDeck(deck, id) {
  const existingIndex = decks.findIndex((item) => item.id === id);
  const entry = { ...deck, id };

  if (existingIndex >= 0) decks[existingIndex] = entry;
  else decks.push(entry);
}

function currentDeck() {
  return decks[selectedDeck] || null;
}

function resetStudy() {
  cardIndex = 0;
  isFlipped = false;
  choiceAnswered = false;
  render();
}

function updateDeckPicker() {
  deckSelect.replaceChildren();

  decks.forEach((deck, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${deck.title} (${deck.cards.length})`;
    deckSelect.append(option);
  });

  if (!decks.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No decks loaded";
    deckSelect.append(option);
  }

  deckSelect.value = decks.length ? String(selectedDeck) : "";
  downloadButton.disabled = !decks.length;
}

function makeProgress(index, total) {
  const wrapper = document.createElement("div");
  const text = document.createElement("div");
  text.className = "subtle";
  text.textContent = `Card ${index + 1} of ${total}`;

  const track = document.createElement("div");
  track.className = "progress-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuemin", "1");
  track.setAttribute("aria-valuemax", String(total));
  track.setAttribute("aria-valuenow", String(index + 1));
  track.setAttribute("aria-label", "Study progress");

  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = `${((index + 1) / total) * 100}%`;
  track.append(fill);
  wrapper.append(text, track);
  return wrapper;
}

function showEmpty(message, heading = "No deck loaded yet") {
  const box = document.createElement("div");
  box.className = "panel empty-state";
  const title = document.createElement("h2");
  title.textContent = heading;
  const detail = document.createElement("p");
  detail.textContent = message;
  box.append(title, detail);
  studyArea.replaceChildren(box);
}

function renderOverview(deck) {
  const panel = document.createElement("section");
  panel.className = "panel";

  const heading = document.createElement("div");
  heading.className = "panel-heading";
  const title = document.createElement("h2");
  title.textContent = deck.title;
  const count = document.createElement("span");
  count.className = "subtle";
  count.textContent = `${deck.cards.length} cards`;
  heading.append(title, count);

  const grid = document.createElement("div");
  grid.className = "card-grid";

  deck.cards.forEach((card, index) => {
    const item = document.createElement("article");
    item.className = "overview-card";

    const label = document.createElement("h3");
    label.textContent = `Card ${index + 1}`;
    const question = document.createElement("p");
    question.textContent = card.question;
    const answer = document.createElement("p");
    answer.className = "answer-text";
    answer.textContent = card.answer;

    item.append(label, question, answer);
    grid.append(item);
  });

  panel.append(heading, grid);
  studyArea.replaceChildren(panel);
}

function renderFlashcard(deck, card) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const heading = document.createElement("div");
  heading.className = "panel-heading";
  const title = document.createElement("h2");
  title.textContent = deck.title;
  heading.append(title, document.createTextNode("Flashcards"));

  const progress = makeProgress(cardIndex, deck.cards.length);
  const wrap = document.createElement("div");
  wrap.className = "flash-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = `flashcard${isFlipped ? " flipped" : ""}`;
  button.setAttribute("aria-label", isFlipped ? "Show question" : "Reveal answer");
  button.addEventListener("click", () => {
    isFlipped = !isFlipped;
    render();
  });

  const inner = document.createElement("span");
  inner.className = "flashcard-inner";

  const front = document.createElement("span");
  front.className = "flash-face front";
  const frontLabel = document.createElement("span");
  frontLabel.className = "flash-label";
  frontLabel.textContent = "Question";
  const frontText = document.createElement("span");
  frontText.className = "flash-text";
  frontText.textContent = card.question;
  const frontHint = document.createElement("span");
  frontHint.className = "hint";
  frontHint.textContent = "Select the card to reveal the answer";
  front.append(frontLabel, frontText, frontHint);

  const back = document.createElement("span");
  back.className = "flash-face back";
  const backLabel = document.createElement("span");
  backLabel.className = "flash-label";
  backLabel.textContent = "Answer";
  const backText = document.createElement("span");
  backText.className = "flash-text";
  backText.textContent = card.answer;
  const backHint = document.createElement("span");
  backHint.className = "hint";
  backHint.textContent = "Select the card to see the question";
  back.append(backLabel, backText, backHint);

  inner.append(front, back);
  button.append(inner);
  wrap.append(button);

  const controls = document.createElement("div");
  controls.className = "controls";

  const previous = document.createElement("button");
  previous.className = "text-button";
  previous.type = "button";
  previous.textContent = "← Previous";
  previous.disabled = cardIndex === 0;
  previous.addEventListener("click", () => {
    cardIndex -= 1;
    isFlipped = false;
    render();
  });

  const next = document.createElement("button");
  next.className = "button button-primary";
  next.type = "button";
  next.textContent = cardIndex === deck.cards.length - 1 ? "Start over" : "Next →";
  next.addEventListener("click", () => {
    cardIndex = cardIndex === deck.cards.length - 1 ? 0 : cardIndex + 1;
    isFlipped = false;
    render();
  });

  controls.append(previous, next);
  panel.append(heading, progress, wrap, controls);
  studyArea.replaceChildren(panel);
}

function makeChoices(card, allCards) {
  let choices = card.options ? [...card.options] : [];

  if (choices.length && !choices.some((item) => item === card.answer)) {
    choices.push(card.answer);
  }

  if (!choices.length) {
    const wrongAnswers = [...new Set(
      allCards.map((item) => item.answer).filter((answer) => answer !== card.answer)
    )];

    for (let i = wrongAnswers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrongAnswers[i], wrongAnswers[j]] = [wrongAnswers[j], wrongAnswers[i]];
    }

    choices = [...wrongAnswers.slice(0, 3), card.answer];
  }

  // Shuffle the options each time the question is rendered.
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}

function renderMultipleChoice(deck, card) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const heading = document.createElement("div");
  heading.className = "panel-heading";
  const title = document.createElement("h2");
  title.textContent = deck.title;
  heading.append(title, document.createTextNode("Multiple choice"));

  const progress = makeProgress(cardIndex, deck.cards.length);
  const question = document.createElement("p");
  question.className = "question";
  question.textContent = card.question;

  const list = document.createElement("div");
  list.className = "choice-list";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Answer choices");

  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("aria-live", "polite");

  const choices = makeChoices(card, deck.cards);
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.textContent = choice;
    button.disabled = choiceAnswered;

    if (choiceAnswered && choice === card.answer) button.classList.add("correct");

    button.addEventListener("click", () => {
      choiceAnswered = true;
      render();

      const buttons = studyArea.querySelectorAll(".choice");
      buttons.forEach((item) => {
        item.disabled = true;
        if (item.textContent === card.answer) item.classList.add("correct");
        else if (item.textContent === choice && choice !== card.answer) {
          item.classList.add("incorrect");
        }
      });

      const result = studyArea.querySelector(".feedback");
      const isCorrect = choice === card.answer;
      result.textContent = isCorrect ? "Correct — nice work!" : `Not quite. The answer is: ${card.answer}`;
      result.className = `feedback ${isCorrect ? "correct" : "incorrect"}`;
    });

    list.append(button);
  });

  if (choiceAnswered) {
    feedback.textContent = "Answer submitted.";
  }

  const controls = document.createElement("div");
  controls.className = "controls";
  const next = document.createElement("button");
  next.className = "button button-primary";
  next.type = "button";
  next.textContent = cardIndex === deck.cards.length - 1 ? "Start over" : "Next question";
  next.disabled = !choiceAnswered;
  next.addEventListener("click", () => {
    cardIndex = cardIndex === deck.cards.length - 1 ? 0 : cardIndex + 1;
    choiceAnswered = false;
    render();
  });

  controls.append(next);
  panel.append(heading, progress, question, list, feedback, controls);
  studyArea.replaceChildren(panel);
}

function render() {
  updateDeckPicker();
  const deck = currentDeck();

  if (!deck) {
    showEmpty(
      "Add JSON files to the configured public GitHub folder, or choose a JSON file from your device."
    );
    return;
  }

  const card = deck.cards[cardIndex];
  if (mode === "overview") renderOverview(deck);
  else if (mode === "flashcard") renderFlashcard(deck, card);
  else renderMultipleChoice(deck, card);
}

async function loadGitHubDecks() {
  if (!GITHUB_REPO || GITHUB_REPO === "YOUR_REPOSITORY_NAME") {
    setStatus("Set your GitHub repository name in app.js");
    render();
    return;
  }

  setStatus("Checking GitHub for decks…");

  const path = DECK_FOLDER
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${path}`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}. Check the repo name and folder.`);
    }

    const entries = await response.json();
    if (!Array.isArray(entries)) {
      throw new Error("The configured GitHub path is not a folder.");
    }

    const jsonFiles = entries.filter((item) =>
      item.type === "file" && item.name.toLowerCase().endsWith(".json")
    );

    const results = await Promise.allSettled(jsonFiles.map(async (file) => {
      const fileResponse = await fetch(file.download_url);
      if (!fileResponse.ok) throw new Error(`Could not read ${file.name}`);
      const data = await fileResponse.json();
      return { name: file.name, deck: normalizeDeck(data, file.name.replace(/\.json$/i, "")) };
    }));

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        addDeck(result.value.deck, `github:${jsonFiles[index].path}`);
      } else {
        console.warn("Skipped a deck that could not be loaded:", result.reason);
      }
    });

    selectedDeck = Math.max(0, decks.findIndex((deck) => deck.id.startsWith("github:")));
    setStatus(jsonFiles.length ? `Found ${jsonFiles.length} JSON file(s)` : "No JSON decks found in that folder");
    render();
  } catch (error) {
    setStatus(error.message);
    render();
  }
}

deckSelect.addEventListener("change", () => {
  selectedDeck = Number(deckSelect.value) || 0;
  resetStudy();
});

document.querySelectorAll(".mode-tab").forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    resetStudy();
  });
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());
    const deck = normalizeDeck(data, file.name.replace(/\.json$/i, ""));
    addDeck(deck, `local:${file.name}:${Date.now()}`);
    selectedDeck = decks.length - 1;
    setStatus(`Loaded ${file.name}`);
    resetStudy();
  } catch (error) {
    setStatus(`Could not load file: ${error.message}`);
  }

  event.target.value = "";
});

downloadButton.addEventListener("click", () => {
  const deck = currentDeck();
  if (!deck) return;

  const json = JSON.stringify({
    title: deck.title,
    cards: deck.cards.map((card) => ({
      question: card.question,
      answer: card.answer,
      ...(card.options ? { options: card.options } : {})
    }))
  }, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = deck.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "flashcards";
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#refreshButton").addEventListener("click", loadGitHubDecks);

render();
loadGitHubDecks();
