# Particles Playground

A WebGL project driven by particles, built with Three.js and GSAP. The particles are constructed using custom shaders and utilize image textures as the base for coloring and rendering their appearance.

![Demo 1](https://github.com/user-attachments/assets/8adcc20f-205a-43e4-bd06-79a88d9db6d0)
![Demo 2](https://github.com/user-attachments/assets/20772a8e-5572-452d-a39e-481976484d97)

Custom shaders handle particle behavior, transforming images into interactive displays. It supports dynamic effects like texture transitions, mouse and touch interactions, and a flowing "tail" effect for interaction with particles. Performance is optimized with FPS limiting and throttled events.

This project utilizes GLSL 2D simplex noise within the shaders, originally developed by [Ian McEwan](https://github.com/ashima/webgl-noise/blob/master/src/noise2D.glsl). This project is inspired by [Bruno Imbrizi's Interactive Particles](https://github.com/brunoimbrizi/interactive-particles).

For a more in-depth demo - check out my full Live Online example @ https://isladjan.com/work/3/quotes/

<br />

# Requirements

To run this project, you'll need the following:

- [three.js](https://github.com/mrdoob/three.js/)
- [gsap](https://github.com/gsap/gsap)
  <br />

# Installation

```
npm install

//run example
npx vite
npx vite --host        //expose 'host' for external/mobile device
npx vite build
npx vite preview
```

<br />

# How to use

Grab effect.js or the minified version and set it up according to the example in index.html.

```javascript
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
  ...
];
let effect = new Effect(texturesOptions);
effect.init();
```

<br />

# License

This project is licensed under the MIT License - see below for details:

MIT License

Copyright (c) [year] Sladjan Ilic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# Image Credits

Images used in this project were sourced from [Flickr](https://www.flickr.com/). All rights belong to their respective owners.

# Full Live Demo + additional info

[Full Live Demo](https://isladjan.com/work/3/)



# Author

Sladjan Ilic - [isladjan.com](https://isladjan.com/)
