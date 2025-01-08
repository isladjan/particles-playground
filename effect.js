// Three.js particles playground - https://github.com/isladjan/particlesPlayground
// Author : Sladjan Ilic, https://www.isladjan.com/.

"use strict";
import gsap from "gsap";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  TextureLoader,
  Clock,
  VideoTexture,
  InstancedBufferGeometry,
  BufferAttribute,
  InstancedBufferAttribute,
  Vector2,
  RawShaderMaterial,
  Mesh,
  Texture,
  PlaneGeometry,
  MeshBasicMaterial,
  Raycaster,
} from "three";

let dom = {};
let delta = 0;
let f;

export default class Effect {
  //MARK: - constructor
  constructor(texturesOptions) {
    console.log(
      `\n%cMade by isladjan ➡  https://twitter.com/isladjan`,
      'color:#40a6ce; background:#4087ce33; font-size:1.0rem; display:block; padding:0.4rem 0.6rem; margin-bottom: 13px; font-family: "Courier New", Courier, monospace; border: 2px solid #40a6ce; border-radius: 8px; text-shadow: 1px 1px 1px #000000bf;'
    );

    // Stores the index of the currently displayed texture; starts from the second one
    this.textureIndex = 0;

    // For the initial image
    this.threshold = 30;

    // Tracks the last click time to prevent rapid clicks
    this.lastClick = 0;

    // Flag that enables the interactive particle movement technique on mouse hover
    // Achieved via a series of effects that track the mouse in an offscreen canvas, then pass data to the shader
    // This can be performance-heavy, so it’s disabled at certain times
    this.tail = {};
    this.tail.on = true;

    // Add these new properties for smooth movement
    this.targetRotation = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };
    this.rotationSpeed = 0.08; // Adjust this value to control smoothing (lower = smoother)
    this.rotationFactor = 25; // Adjust this value to control rotation amount (higher = subtler)
    this.lastArrowClick = 0;

    // Configuration for each texture
    this.texturesOptions = [...texturesOptions];
  }

  //MARK: -init
  init() {
    // Check if device supports touch by testing for touch events
    this.isTouchDevice =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;

    if (this.isTouchDevice) {
      document.querySelector(
        ".effect .info-container .quote-text"
      ).textContent =
        "Use the arrows below to navigate to the next scene. Take a moment to explore each scene and interact with the particles by touching the screen!";
    }

    this.threeInit();
    this.textureInit();

    // Wait for the first texture to load before initializing particles
    this.firstTexturePromise.then(() => {
      this.pixelExtraction();

      this.initParticles();

      gsap.set(".loading-msg", { display: "none" });

      this.initTail();

      this.initRaycaster();

      // Replace window resize event with ResizeObserver
      this.resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          this.resize();
        });
      });
      this.resizeObserver.observe(this.canvas);

      // Initialize central arrow on screen
      this.centralArrowInit();

      // Add keyboard event listener (left and right arrow keys)
      if (!this.isTouchDevice) this.keyboardEventInit();

      // when the user clicks anywhere in the viewport, the particles animate (except in Scene 1)
      this.clickEventInit();

      //start Renderer
      gsap.ticker.fps(60);
      this.limitFPS(1 / 60);

      this.initialAnimation();
    });
  }

  //MARK: -threeInit
  threeInit() {
    this.canvas = document.querySelector(".effect .canvas-container");
    dom.infoContainer = document.querySelector(".effect .info-container");
    this.quoteText = dom.infoContainer.querySelector(".quote-text");

    const pixelRatio = window.devicePixelRatio;
    let AA = true;
    if (this.isTouchDevice) AA = false;
    if (pixelRatio > 2) AA = false;
    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      alpha: true,
      antialias: AA,
      stencil: false,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.canvas.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.z = 180;
    this.clock = new Clock(true);
  }

  //MARK: - textureInit
  textureInit() {
    this.loader = new TextureLoader();

    // Convert the loader.load to return a Promise
    this.firstTexturePromise = new Promise((resolve) => {
      this.texture = this.loader.load(
        this.texturesOptions[0].url,
        (texture) => resolve(texture)
      );
    });

    // Asynchronously loading each texture
    // If you are using larger textures, use **THREE.ImageBitmapLoader** and **renderer.initTexture**.
    Promise.all([
      ...this.texturesOptions.map((texture) => {
        return this.loader.load(texture.url);
      }),
    ]).then((result) => {
      // Save all loaded textures in order
      this.texturesArray = result;
    });
  }

  //MARK: - pixelExtraction
  pixelExtraction() {
    this.width = this.texture.image.width;
    this.height = this.texture.image.height;

    this.totalPoints = this.width * this.height;

    this.visiblePoints = 0;
    this.threshold = this.texturesOptions[this.textureIndex].threshold;

    const img = this.texture.image;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = this.width;
    canvas.height = this.height;
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0, this.width, this.height * -1);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.arrayOfColors = Float32Array.from(imgData.data);

    for (let i = 0; i < this.totalPoints; i++) {
      if (this.arrayOfColors[i * 4 + 0] > this.threshold) this.visiblePoints++;
    }

    //console.log("pixelExtraction: visiblePoints", this.visiblePoints, this.totalPoints);
  }

  //MARK: - initParticles
  initParticles() {
    this.geometryParticles = new InstancedBufferGeometry();
    const positions = new BufferAttribute(new Float32Array(4 * 3), 3);
    positions.setXYZ(0, -0.5, 0.5, 0.0);
    positions.setXYZ(1, 0.5, 0.5, 0.0);
    positions.setXYZ(2, -0.5, -0.5, 0.0);
    positions.setXYZ(3, 0.5, -0.5, 0.0);
    this.geometryParticles.setAttribute("position", positions);

    const uvs = new BufferAttribute(new Float32Array(4 * 2), 2);
    uvs.setXYZ(0, 0.0, 0.0);
    uvs.setXYZ(1, 1.0, 0.0);
    uvs.setXYZ(2, 0.0, 1.0);
    uvs.setXYZ(3, 1.0, 1.0);
    this.geometryParticles.setAttribute("uv", uvs);

    this.geometryParticles.setIndex(
      new BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1)
    );

    const offsets = new Float32Array(this.totalPoints * 3);
    const indices = new Uint16Array(this.totalPoints);
    const angles = new Float32Array(this.totalPoints);

    for (let i = 0, j = 0; i < this.totalPoints; i++) {
      if (this.arrayOfColors[i * 4 + 0] <= this.threshold) continue;

      offsets[j * 3 + 0] = i % this.width;
      offsets[j * 3 + 1] = Math.floor(i / this.width);

      indices[j] = i;
      angles[j] = Math.random() * Math.PI;

      j++;
    }

    this.geometryParticles.setAttribute(
      "offset",
      new InstancedBufferAttribute(offsets, 3, false)
    );
    this.geometryParticles.setAttribute(
      "angle",
      new InstancedBufferAttribute(angles, 1, false)
    );
    this.geometryParticles.setAttribute(
      "pindex",
      new InstancedBufferAttribute(indices, 1, false)
    );

    // Initial parameters for the first image (altered for each subsequent image)
    const uniforms = {
      uTime: { value: 0 },
      uRandom: { value: 3.0 },
      uDepth: { value: 0.0 },
      uSize: { value: 1.5 },
      uTextureSize: { value: new Vector2(this.width, this.height) },
      uTexture: { value: this.texture },
      uTouch: { value: null }, // Tail texture
      uAlphaCircle: { value: 0.0 }, // Opacity for circles (0.0 = fully visible, 1.0 = invisible)
      uAlphaSquare: { value: 1.0 },
      uCircleORsquare: { value: 0.0 }, // 1 -> squares, 0 -> circles
    };

    const materialParticles = new RawShaderMaterial({
      uniforms: uniforms,
      vertexShader: this.vertexShader(),
      fragmentShader: this.fragmentShader(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      //blending: AdditiveBlending
      // alphaTest: 0.5
    });
    this.particlesMesh = new Mesh(this.geometryParticles, materialParticles);
    this.scene.add(this.particlesMesh);
  }

  //MARK: - vertexShader
  vertexShader() {
    return `
  precision highp float;
  
  attribute float pindex;
  attribute vec3 position;
  attribute vec3 offset;
  attribute vec2 uv;
  attribute float angle;
  
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  
  uniform float uTime;
  uniform float uRandom;
  uniform float uDepth;
  uniform float uSize;
  uniform vec2 uTextureSize;
  uniform sampler2D uTexture;
  uniform sampler2D uTouch;
  
  varying vec2 vPUv;
  varying vec2 vUv;
  
  
  vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec2 mod289(vec2 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec3 permute(vec3 x) {
      return mod289(((x*34.0)+1.0)*x);
  }
  
  float snoise(vec2 v)
      {
      const vec4 C = vec4(0.211324865405187, 
                          0.366025403784439, 
                      -0.577350269189626,  
                          0.024390243902439); 
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
  
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
  
      i = mod289(i); 
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
  
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
  
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
  }

  float random(float n) {
      return fract(sin(n) * 43758.5453123);
  }
  
  void main() {
    // Author : Sladjan Ilic, https://www.isladjan.com/.
      vUv = uv;
      
      vec2 puv = offset.xy / uTextureSize;
      vPUv = puv;
  
      vec4 colA = texture2D(uTexture, puv);
      float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;
  
      vec3 displaced = offset;     
      displaced.xy += vec2(random(pindex) - 0.5, random(offset.x + pindex) - 0.5) * uRandom;
      float rndz = (random(pindex) + snoise(vec2(pindex * 0.1, uTime * 0.1)));  
      displaced.z += rndz * (random(pindex) * 2.0 * uDepth);               
      displaced.xy -= uTextureSize * 0.5;
  
      float t = texture2D(uTouch, puv).r;
      displaced.z += t * -40.0 * rndz;
      displaced.x += cos(angle) * t * 40.0 * rndz;
      displaced.y += sin(angle) * t * 40.0 * rndz;
  
      float psize = (snoise(vec2(uTime, pindex) * 0.5) + 2.0);
      psize *= max(grey, 0.2);
      psize *= uSize;
  
      vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
      mvPosition.xyz += position * psize;
      gl_Position = projectionMatrix * mvPosition;
  }
`;
  }

  //MARK: - fragmentShader
  fragmentShader() {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uAlphaCircle;        
      uniform float uAlphaSquare;          
      uniform float uCircleORsquare;

      varying vec2 vPUv;
      varying vec2 vUv;

      void main() {
        // Author : Sladjan Ilic, https://www.isladjan.com/.
          vec4 color = vec4(0.0);
          vec2 uv = vUv;
          vec2 puv = vPUv;

          vec4 colA = texture2D(uTexture, puv);

          float border = 0.3;
          float radius = 0.5;
          float dist = radius - distance(uv, vec2(0.5));   
          float t = smoothstep(uCircleORsquare, border, dist);

          color = colA;
          color.a = t;

          //gl_FragColor = vec4(color.r, color.g, color.b, uAlphaSquare);
          gl_FragColor = vec4(color.r, color.g, color.b, t - uAlphaCircle);
  }
`;
  }

  //MARK: - initTail
  initTail() {
    this.tail.array = [];
    this.tail.size = 80;
    this.tail.maxAge = 70;
    this.tail.radius = 0.08;
    this.tail.red = 255;

    this.tail.canvas = document.createElement("canvas");
    this.tail.canvas.width = this.tail.canvas.height = this.tail.size;
    this.tail.ctx = this.tail.canvas.getContext("2d");
    this.tail.ctx.fillStyle = "black";
    this.tail.ctx.fillRect(
      0,
      0,
      this.tail.canvas.width,
      this.tail.canvas.height
    );

    this.tail.texture = new Texture(this.tail.canvas);
    this.particlesMesh.material.uniforms.uTouch.value = this.tail.texture;
  }

  //MARK: - initRaycaster
  initRaycaster() {
    const geometryPlate = new PlaneGeometry(this.width, this.height, 1, 1);
    const materialPlate = new MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      depthTest: false,
    });
    materialPlate.visible = false;
    this.hoverPlate = new Mesh(geometryPlate, materialPlate);
    this.scene.add(this.hoverPlate);

    this.raycaster = new Raycaster();
    this.mouse = new Vector2(0, 0);

    // Add throttling
    this.throttledMouseMove = throttle(this.onMouseMove.bind(this), 16); // ~60fps

    // Add both mouse and touch event listeners
    window.addEventListener("mousemove", this.throttledMouseMove, false);
    if (this.isTouchDevice) {
      window.addEventListener("touchmove", this.handleTouch.bind(this), false);
      window.addEventListener("touchstart", this.handleTouch.bind(this), false);
    }

    // throttle utility method
    function throttle(func, limit) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    }
  }

  //MARK: - handleTouch
  handleTouch(event) {
    event.preventDefault(); // Prevent scrolling while touching
    const touch = event.touches[0];
    if (!touch) return;

    // Convert touch coordinates to mouse coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Use the same mouse move logic for touch events
    this.onMouseMove({
      clientX: x,
      clientY: y,
    });
  }

  //MARK: - onMouseMove
  onMouseMove(event) {
    // Convert coordinates to normalized device coordinates (-1 to +1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    //tail
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = this.raycaster.intersectObjects([this.hoverPlate]);
    if (intersects[0] && this.tail.on) this.buildTail(intersects[0].uv);

    // Update target rotation based on mouse/touch position
    this.targetRotation.y = this.mouse.x / this.rotationFactor;
    this.targetRotation.x = -this.mouse.y / this.rotationFactor;
  }

  //MARK: - buildTail
  buildTail(uv) {
    let force = 0;
    const last = this.tail.array[this.tail.array.length - 1];
    if (last) {
      const dx = last.x - uv.x;
      const dy = last.y - uv.y;
      const dd = dx * dx + dy * dy;
      force = Math.min(dd * 10000, 1);
    }
    this.tail.array.push({ x: uv.x, y: uv.y, age: 0, force });
  }

  resize() {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    if (window.innerWidth / window.innerHeight < 2.8) f = -0.2;
    else f = 0.1;

    const fovHeight =
      2 *
      Math.tan((this.camera.fov * Math.PI) / 180 / 2) *
      this.camera.position.z;
    const scale = fovHeight / this.height + f;
    this.particlesMesh.scale.set(scale, scale, 1);
    if (this.hoverPlate) this.hoverPlate.scale.set(scale, scale, 1);
  }

  //MARK: - initialAnimation
  initialAnimation() {
    this.initialAnimation1 = gsap.fromTo(
      this.particlesMesh.material.uniforms.uDepth,
      { value: 0 },
      { value: 30.0, ease: "elastic.in(1, 0.3)", delay: 2, duration: 2 }
    );

    this.initialAnimation2 = gsap.to(
      this.particlesMesh.material.uniforms.uDepth,
      { value: 0, ease: "elastic.in(1, 0.3)", delay: 4, duration: 2 }
    );

    // Displays touch arrows on the screen
    gsap.to(".navigation", { opacity: 1, duration: 0.5, delay: 0.5 });
  }

  //MARK: - changeTexture
  // Scene change
  changeTexture(direction) {
    // Prevents rapid clicks
    if (Date.now() - this.lastClick < 300) return;
    this.lastClick = Date.now();

    // Kills active animations if they haven’t finished
    if (this.textureAnimation0) this.textureAnimation0.kill();
    if (this.textureAnimation1) this.textureAnimation1.kill();
    if (this.textureAnimation2) this.textureAnimation2.kill();
    if (this.textureAnimation5) this.textureAnimation5.kill();
    this.particlesMesh.rotation.z = 0.0;

    // Update texture index based on direction
    if (direction === "left") {
      this.textureIndex--;
      if (this.textureIndex < 0)
        this.textureIndex = this.texturesOptions.length - 1;
    } else if (direction === "right") {
      this.textureIndex++;
      if (this.textureIndex === this.texturesOptions.length)
        this.textureIndex = 0;
    }
    // alias
    let opt = this.texturesOptions[this.textureIndex];
    let t = this.texturesArray[this.textureIndex];

    // Reset after the very first click
    if (this.textureIndex == 1) {
      this.initialAnimation1.kill(null, "z");
      this.initialAnimation2.kill();
      gsap.fromTo(
        this.particlesMesh.rotation,
        { z: 0.5 },
        { z: 0, duration: 0.3 }
      );
      clearTimeout(this.timeoutClickInfo);
    }

    // Images and videos are fixed in size
    this.width = 250;
    this.height = 145;

    // If it's a video
    if (opt.texture == "video") {
      this.video = t.image;
      this.video.currentTime = 0;

      this.texture = t;
      this.particlesMesh.material.uniforms.uTexture.value = t;
      this.totalPoints = this.width * this.height;
      this.video.play(); // starts video loading

      // If it's an image
    } else {
      this.texture = t;
      this.particlesMesh.material.uniforms.uTexture.value = t;
    }

    this.particlesMesh.material.uniforms.uTextureSize.value.x = this.width;
    this.particlesMesh.material.uniforms.uTextureSize.value.y = this.height;

    this.particlesMesh.material.uniforms.uRandom.value = opt.random;
    this.particlesMesh.material.uniforms.uDepth.value = opt.depth;
    this.particlesMesh.material.uniforms.uSize.value = opt.size;
    this.particlesMesh.material.uniforms.uCircleORsquare.value = opt.square;

    if (opt.texture != "video") this.pixelExtraction();

    /*  For each image, compute the screen position (offset) again */
    // so dark pixels for a given image won’t appear as circles
    const offsets = new Float32Array(this.totalPoints * 3);
    const indices = new Uint16Array(this.totalPoints);
    const angles = new Float32Array(this.totalPoints);

    for (let i = 0, j = 0; i < this.totalPoints; i++) {
      // If it's video, skip. If it's an image, check threshold
      if (opt.texture != "video")
        if (this.arrayOfColors[i * 4 + 0] <= this.threshold) continue;
      if (this.textureIndex === 18)
        if (this.arrayOfColors[i * 4 + 0] <= this.threshold) continue; // create a mask on video

      offsets[j * 3 + 0] = i % this.width;
      offsets[j * 3 + 1] = Math.floor(i / this.width);

      indices[j] = i;
      angles[j] = Math.random() * Math.PI;

      j++;
    }
    this.geometryParticles.setAttribute(
      "offset",
      new InstancedBufferAttribute(offsets, 3, false)
    );
    this.geometryParticles.setAttribute(
      "angle",
      new InstancedBufferAttribute(angles, 1, false)
    );
    this.geometryParticles.setAttribute(
      "pindex",
      new InstancedBufferAttribute(indices, 1, false)
    );

    // When the last texture in the array is shown, loop back to the beginning
    if (this.textureIndex === this.texturesOptions.length)
      this.textureIndex = 0;

    if (!opt.maxDepth) opt.maxDepth = 30;

    // Quote text animations
    let tl = gsap.timeline();
    tl.fromTo(this.quoteText, { opacity: 1 }, { opacity: 0, duration: 0.5 }, 0);
    tl.fromTo(
      dom.infoContainer,
      { rotation: 0 },
      {
        rotation: 180,
        transformOrigin: "center",
        ease: "power2.out",
        duration: 1,
      },
      0
    );
    tl.call(
      () => {
        this.quoteText.innerHTML = opt.quote;
        gsap.set(this.quoteText, {
          rotation: 180,
          opacity: 1,
          transformOrigin: "center",
        });
        gsap.set(".quote-text", { perspective: 400 });
      },
      null,
      0.5
    );

    // Subtle pulse on the infoContainer
    this.textureAnimation0 = tl.fromTo(
      dom.infoContainer,
      { scale: 1 },
      {
        scale: 1.3,
        transformOrigin: "center",
        ease: "elastic.in(1, 0.3)",
        yoyo: true,
        repeat: 1,
        duration: 1,
      },
      2.8
    );

    // camera animation zoom
    this.textureAnimation1 = gsap.fromTo(
      this.particlesMesh.position,
      { z: 0.0 },
      {
        z: 15.0,
        ease: "elastic.in(1, 0.3)",
        yoyo: true,
        repeat: 1,
        repeatDelay: 5,
        duration: 4,
      }
    );

    // Texture animation
    this.textureAnimation2 = gsap.fromTo(
      this.particlesMesh.material.uniforms.uDepth,
      { value: opt.depth },
      {
        value: opt.maxDepth,
        ease: "elastic.in(1, 0.3)",
        repeatDelay: 5,
        repeat: 1,
        yoyo: true,
        duration: 4,
      }
    );
  }

  //MARK: -limitFPS
  limitFPS(interval) {
    this.rafAnimate = requestAnimationFrame(this.limitFPS.bind(this, interval));
    delta += this.clock.getDelta();

    if (delta > interval) {
      this.animate();
      delta = delta % interval;
    }
  }

  //MARK: -stopRafAnimate
  stopRafAnimate() {
    cancelAnimationFrame(rafAnimate);
  }

  //MARK: - animate
  animate() {
    const delta = this.clock.getDelta();

    this.currentRotation.x +=
      (this.targetRotation.x - this.currentRotation.x) * this.rotationSpeed;
    this.currentRotation.y +=
      (this.targetRotation.y - this.currentRotation.y) * this.rotationSpeed;

    // Apply smoothed rotation
    this.particlesMesh.rotation.x = this.currentRotation.x;
    this.particlesMesh.rotation.y = this.currentRotation.y;

    this.particlesMesh.material.uniforms.uTime.value += delta;

    if (this.tail.on) this.drawTail();
    this.tail.texture.needsUpdate = true;

    this.texture.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  //MARK: - drawTail
  // Draws the this.tail on a hidden canvas, then sends it as a texture to the shader,
  // creating an interactive effect with the circles
  drawTail() {
    this.tail.ctx.fillStyle = "black";
    this.tail.ctx.fillRect(
      0,
      0,
      this.tail.canvas.width,
      this.tail.canvas.height
    );

    const easeOutSine = (t, b, c, d) => {
      return c * Math.sin((t / d) * (Math.PI / 2)) + b;
    };

    this.tail.array.forEach((point, i) => {
      point.age++;
      if (point.age > this.tail.maxAge) {
        this.tail.array.splice(i, 1);
      } else {
        const pos = {
          x: point.x * this.tail.size,
          y: (1 - point.y) * this.tail.size,
        };

        let intensity = 1;
        if (point.age < this.tail.maxAge * 0.3) {
          intensity = easeOutSine(
            point.age / (this.tail.maxAge * 0.3),
            0,
            1,
            1
          );
        } else {
          intensity = easeOutSine(
            1 - (point.age - this.tail.maxAge * 0.3) / (this.tail.maxAge * 0.7),
            0,
            1,
            1
          );
        }

        intensity *= point.force;
        const radius = this.tail.size * this.tail.radius * intensity;
        const grd = this.tail.ctx.createRadialGradient(
          pos.x,
          pos.y,
          radius * 0.25,
          pos.x,
          pos.y,
          radius
        );
        grd.addColorStop(0, "rgba(" + this.tail.red + ", 255, 255, 0.2)");
        grd.addColorStop(1, "rgba(0, 0, 0, 0.0)");

        this.tail.ctx.beginPath();
        this.tail.ctx.fillStyle = grd;
        this.tail.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.tail.ctx.fill();
      }
    });
  }

  // Initialize central arrow on screen
  // MARK: -centralArrowInit
  centralArrowInit() {
    const arrowLeft = document.querySelector(
      ".central-arrows .central-arrow-left"
    );
    const arrowRightC = document.querySelector(
      ".central-arrows .central-arrow-right-w"
    );
    const activeColor = "#ffc900";
    const self = this;
    let tween1 = gsap.set(document, {});
    let tween2 = gsap.set(document, {});
    this.rightArrowDeactivated = false;

    // Create right arrow by cloning the left one
    const arrowRight = arrowLeft.cloneNode(true);
    arrowRight.setAttribute("class", "central-arrow-right");
    arrowRightC.appendChild(arrowRight);

    arrowLeft.addEventListener("mousedown", () => {
      // Check if enough time has passed since last click
      if (Date.now() - this.lastArrowClick < 500) return; // 500ms = 0.5s
      this.lastArrowClick = Date.now();

      // When user clicks the arrow, it quickly scales up if not deactivated
      if (!arrowLeft.classList.contains("deactivate")) {
        tween1 = gsap.set(".central-arrows .central-arrow-left path.outsideW", {
          fill: activeColor,
          opacity: 1,
          duration: 0.2,
        });
        gsap.to(".central-arrows .central-arrow-left path.insideW", {
          y: 4,
          duration: 0.2,
        });
        gsap.to(".central-arrows .central-arrow-left path.insideW", {
          y: 0,
          duration: 0.2,
          delay: 0.2,
        });

        // After all resources are ready, wait for a click to trigger the texture switch function
        self.changeTexture("left");
      }
    });

    arrowRight.addEventListener("mousedown", () => {
      // Check if enough time has passed since last click
      if (Date.now() - this.lastArrowClick < 500) return; // 500ms = 0.5s
      this.lastArrowClick = Date.now();

      if (!arrowRight.classList.contains("deactivate")) {
        tween2 = gsap.set(
          ".central-arrows .central-arrow-right path.outsideW",
          {
            fill: activeColor,
            opacity: 1,
            duration: 0.2,
          }
        );
        gsap.to(".central-arrows .central-arrow-right path.insideW", {
          y: 4,
          duration: 0.2,
        });
        gsap.to(".central-arrows .central-arrow-right path.insideW", {
          y: 0,
          duration: 0.2,
          delay: 0.2,
        });

        // Only deactivate if it hasn't been done before
        if (!this.rightArrowDeactivated) {
          document
            .querySelector(".central-arrows .central-arrow-left")
            .classList.remove("deactivate");
          this.rightArrowDeactivated = true;
        }

        self.changeTexture("right");
      }
    });

    arrowLeft.addEventListener("mouseleave", () => {
      tween1.progress(1).kill();
      gsap.set(".central-arrows .central-arrow-left path.outsideW", {
        fill: "#fff",
        opacity: 0.6,
      });
    });
    arrowRight.addEventListener("mouseleave", () => {
      tween2.progress(1).kill();
      gsap.set(".central-arrows .central-arrow-right path.outsideW", {
        fill: "#fff",
        opacity: 0.6,
      });
    });
  }

  //MARK: -keyboardEventInit
  // Add keyboard event listener (left and right arrow keys)
  keyboardEventInit() {
    const arrowLeft = document.querySelector(
      ".central-arrows .central-arrow-left"
    );

    document.addEventListener("keydown", (event) => {
      // Check if enough time has passed since last arrow press
      if (Date.now() - this.lastArrowClick < 300) return;
      this.lastArrowClick = Date.now();

      switch (event.key) {
        case "ArrowLeft":
          if (!arrowLeft.classList.contains("deactivate")) {
            gsap.fromTo(
              ".central-arrows .central-arrow-left",
              { scale: 1.2 },
              { scale: 1, duration: 0.5 }
            );
            this.changeTexture("left");
          }
          break;

        case "ArrowRight":
          gsap.fromTo(
            ".central-arrows .central-arrow-right",
            { scale: 1.2 },
            { scale: 1, duration: 0.5 }
          );
          // Only deactivate if it hasn't been done before
          if (!this.rightArrowDeactivated) {
            document
              .querySelector(".central-arrows .central-arrow-left")
              .classList.remove("deactivate");
            this.rightArrowDeactivated = true;
          }
          this.changeTexture("right");
          break;
      }
    });
  }

  //MARK: -clickEventInit
  // when the user clicks anywhere in the viewport, the particles animate (except in Scene 1)
  clickEventInit() {
    let opt;
    let clickTW = gsap.set(document.body, {});
    document.body.addEventListener("click", (e) => {
      if (
        e.target.closest(".central-arrow-left") ||
        e.target.closest(".central-arrow-right") ||
        e.target.closest(".menu-btn-wrapper") ||
        e.target.closest(".logo")
      )
        return;
      opt = this.texturesOptions[this.textureIndex];

      if (this.textureAnimation1 || this.textureAnimation2) {
        this.textureAnimation1.progress(1).kill();
        this.textureAnimation2.progress(1).kill();
      }
      clickTW.progress(1).kill();
      this.initialAnimation1.progress(1).kill();
      this.initialAnimation2.progress(1).kill();

      if (this.textureIndex !== 0) {
        clickTW = gsap.fromTo(
          this.particlesMesh.material.uniforms.uDepth,
          { value: opt.depth },
          {
            value: opt.maxDepth,
            ease: "expo.out",
            repeatDelay: 1.5,
            duration: 1.5,
            repeat: 1,
            yoyo: true,
          }
        );
      } else {
        clickTW = gsap.fromTo(
          this.particlesMesh.material.uniforms.uDepth,
          { value: 0 },
          {
            value: -500,
            ease: "expo.out",
            repeatDelay: 1.5,
            duration: 1.5,
            repeat: 1,
            yoyo: true,
          }
        );
      }
    });
  }
}
