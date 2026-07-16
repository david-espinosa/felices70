(function () {
  "use strict";

  const app = document.getElementById("app");
  const PRIZE_YOUTUBE_ID = "YX_XXhTkm3s";

  const state = {
    data: null,
    order: [],
    index: 0,
    score: 0,
    wrong: 0,
    fakeDeck: [],
    usedRealIds: new Set(),
    answered: false,
    currentOptions: [],
    messageCache: {},
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function refillFakeDeck() {
    const fresh = shuffle(state.data.fakes);
    const last = state.fakeDeck[state.fakeDeck.length - 1];
    if (last && fresh[0] && fresh[0].name === last.name && fresh.length > 1) {
      [fresh[0], fresh[1]] = [fresh[1], fresh[0]];
    }
    state.fakeDeck = state.fakeDeck.concat(fresh);
  }

  function drawFakes(n) {
    while (state.fakeDeck.length < n) refillFakeDeck();
    return state.fakeDeck.splice(0, n);
  }

  function pickRealDecoy(person) {
    const unseen = state.data.people.filter(
      (p) => p.id !== person.id && !state.usedRealIds.has(p.id)
    );
    const pool = unseen.length > 0 ? unseen : state.data.people.filter((p) => p.id !== person.id);
    return shuffle(pool)[0];
  }

  function buildQuestion(person) {
    const fake = drawFakes(1)[0];
    const decoy = pickRealDecoy(person);
    state.usedRealIds.add(person.id);
    state.usedRealIds.add(decoy.id);

    const options = shuffle([
      { name: person.name, icon: person.icon, real: true },
      { name: decoy.name, icon: decoy.icon, real: false },
      { name: fake.name, icon: fake.icon, real: false },
    ]);
    return options;
  }

  async function getMessageText(person) {
    if (state.messageCache[person.id]) return state.messageCache[person.id];
    const res = await fetch(person.message, { cache: "no-store" });
    const text = (await res.text()).trim();
    state.messageCache[person.id] = text;
    return text;
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else node.setAttribute(k, v);
      }
    }
    (children || []).forEach((c) => {
      if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function render(node) {
    app.innerHTML = "";
    app.appendChild(node);
  }

  function renderIntro() {
    const total = state.data.people.length;
    const screen = el("div", { class: "screen" }, [
      el("img", { class: "intro-image", src: "saw.jpg", alt: "" }),
      el("h1", {}, ["Feliz 70 aniversari, Toni!"]),
      el("div", { class: "intro-card" }, [
        el("p", {}, [
          `Quiero jugar a un juego. Has recibido ${total} felicitaciones de cumpleaños, pero cada una esconde a quien la escribió.`,
        ]),
        el("p", {}, [
          "Lee cada mensaje y adivina quién te lo ha dedicado, eligiendo entre 3 opciones. Solo una es la persona real.",
        ]),
        el("p", {}, [
          el("span", { class: "gift" }, ["Si aciertas todas, recibirás un regalo. "]),
          el("span", { class: "punishment" }, ["Si fallas alguna, recibirás la visita de un personaje muy especial."]),
        ]),
      ]),
      el("div", { class: "spacer" }),
      el("button", { class: "btn" }, ["Siguiente"]),
    ]);
    screen.querySelector("button").addEventListener("click", renderIntroWarning);
    render(screen);
  }

  function renderIntroWarning() {
    const screen = el("div", { class: "screen" }, [
      el("h1", {}, ["Como falles te haré una visita guapetón..."]),
      el("img", { class: "intro-image", src: "guapo.png", alt: "" }),
      el("div", { class: "intro-card" }, [
        el("p", {}, [
          el("span", { class: "punishment" }, ["Este será quien venga a visitarte "]),
          "si fallas alguna respuesta. ¡Más te vale acertarlas todas!",
        ]),
      ]),
      el("div", { class: "spacer" }),
      el("button", { class: "btn" }, ["Empezar"]),
    ]);
    screen.querySelector("button").addEventListener("click", startGame);
    render(screen);
  }

  function startGame() {
    state.order = shuffle(state.data.people);
    state.index = 0;
    state.score = 0;
    state.wrong = 0;
    state.fakeDeck = [];
    state.usedRealIds = new Set();
    renderQuestion();
  }

  async function renderQuestion() {
    const person = state.order[state.index];
    const options = buildQuestion(person);
    state.currentOptions = options;
    state.answered = false;

    const total = state.order.length;
    const pct = Math.round((state.index / total) * 100);

    const screen = el("div", { class: "screen" }, [
      el("div", { class: "progress" }, [
        `${state.index + 1} / ${total}`,
        el("div", { class: "progress-bar" }, [el("div", { class: "progress-bar-fill", style: `width:${pct}%` })]),
      ]),
      el("div", { class: "message-card" }, [el("p", { class: "message-text" }, ["Cargando..."])]),
      el("p", { class: "question-prompt" }, ["¿Quién te ha escrito esto?"]),
      el("div", { class: "options" }, []),
    ]);
    render(screen);

    const text = await getMessageText(person);
    screen.querySelector(".message-text").textContent = text;

    const optionsWrap = screen.querySelector(".options");
    options.forEach((opt) => {
      const button = el("button", { class: "option" }, [
        el("img", { src: opt.icon, alt: "" }),
        el("span", {}, [opt.name]),
      ]);
      button.addEventListener("click", () => selectOption(person, opt, button, screen));
      optionsWrap.appendChild(button);
    });
  }

  function selectOption(person, opt, button, screen) {
    if (state.answered) return;
    state.answered = true;

    const correct = opt.real;
    if (correct) state.score++;
    else state.wrong++;

    const buttons = screen.querySelectorAll(".option");
    buttons.forEach((b) => {
      b.classList.add("locked");
      const name = b.querySelector("span").textContent;
      if (name === person.name) b.classList.add("correct");
      else if (b === button) b.classList.add("wrong");
      else b.classList.add("dimmed");
    });

    screen.querySelector(".question-prompt").style.display = "none";
    screen.querySelector(".options").style.display = "none";

    renderReveal(person, correct, screen);
  }

  function renderReveal(person, correct, screen) {
    const reveal = el("div", { class: "reveal" }, [
      el("p", { class: `reveal-feedback ${correct ? "correct" : "wrong"}` }, [
        correct ? "¡Correcto!" : "¡Fallaste!",
      ]),
      el("img", { src: person.image, alt: person.name }),
      el("p", { class: "reveal-name" }, [person.name]),
    ]);

    const nextBtn = el("button", { class: "btn" }, [
      state.index + 1 < state.order.length ? "Siguiente" : "Ver resultado",
    ]);
    nextBtn.addEventListener("click", () => {
      state.index++;
      if (state.index < state.order.length) renderQuestion();
      else renderEnd();
    });

    screen.appendChild(reveal);
    screen.appendChild(nextBtn);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderEnd() {
    const total = state.order.length;
    const perfect = state.wrong === 0;

    const prizeLink = el(
      "a",
      {
        class: "btn prize-link",
        href: `https://youtu.be/${PRIZE_YOUTUBE_ID}?autoplay=1`,
        target: "_blank",
        rel: "noopener",
      },
      ["Tu premio"]
    );

    const playAgainBtn = el("button", { class: "btn btn-secondary" }, ["Jugar de nuevo"]);
    playAgainBtn.addEventListener("click", startGame);

    const screen = el("div", { class: "screen" }, [
      el("h1", {}, ["¡Lo has conseguido!"]),
      el("div", { class: "intro-card" }, [
        el("p", {}, [
          "Muy bien Toni! Ahora ya puedes acceder a tu regalo, aunque en realidad el mejor regalo es....",
        ]),
      ]),
      prizeLink,
      el("p", { class: "score" }, ["Aciertos: ", el("b", {}, [`${state.score} / ${total}`])]),
      el(
        "p",
        {},
        [
          perfect
            ? "Enhorabuena, Toni. Has adivinado a todos y cada uno de los que te quieren. ¡Feliz cumpleaños!"
            : "Gracias por jugar, Toni. Aquí tienes tu regalo de todos modos. ¡Feliz cumpleaños!",
        ]
      ),
      el("div", { class: "spacer" }),
      playAgainBtn,
    ]);

    render(screen);
  }

  async function init() {
    const res = await fetch("data.json", { cache: "no-store" });
    state.data = await res.json();
    renderIntro();
  }

  init();
})();
