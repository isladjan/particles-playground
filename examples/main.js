import "./style.scss";
import Effect from "../effect.js";

// Array of scene configurations where each object represents a separate scene
// with its own texture(url), text, and particle behavior settings
const texturesOptions = [
  {
    index: 0,
    url: "/img/1.jpg",
    quote:
      "Creating particles so <span class='colorful'>colorful</span>, they might just distract you from reading this text.",
    threshold: 20,
    random: 4.0,
    depth: 1.0,
    size: 1.7,
    square: 0,
  },

  {
    index: 1,
    url: "/img/2.jpg",
    quote:
      "Hello, curious human, or are you just  <span style='color:#f4852a'>here</span> for the particles?",
    threshold: 60,
    random: 1.0,
    depth: 1.0,
    size: 0.5,
    square: 1,
  },

  {
    index: 2,
    url: "/img/3.jpg",
    quote:
      "Hey, I'm <span style='color:#6cc4bb'>iSladjan</span> a freelancer developer who enjoys creating websites and animations.",
    threshold: 10,
    random: 1.0,
    depth: 2.0,
    size: 1.2,
    square: 0,
  },

  {
    index: 3,
    url: "/img/4.jpg",
    quote:
      "<span style='color:#df2a2a'>Particles</span> — because smooth animations were too mainstream.",
    threshold: 100,
    random: 2.0,
    depth: 2.0,
    maxDepth: 60,
    size: 1.5,
    square: 0,
  },
];
let effect = new Effect(texturesOptions);
effect.init();
