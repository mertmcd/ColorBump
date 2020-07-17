import assetManager from "./assetManager";
import Confetti from "../utils/confetti";
import Ui from "./ui";
import Level from "./level";
import {Body, Sphere, Plane, Box, Vec3} from "cannon";
import {Vector3, Box3} from "three";
import {BrotliDecompressedSize} from "../brotli/unbrotli";

var gameEnded = false;
var main, clock, controls, ui;
var isTest = true;
var data, confettiMaker;
var updateFunction;

class Game {
  constructor(_main) {}

  boot(_main) {
    main = _main;
    main.data = app.data;
    data = app.data;
    main.isTest = isTest;

    main.renderer.outputEncoding = THREE.GammaEncoding;
    main.renderer.gammaFactor = 2.2;

    ////add fog here if you want fog

    clock = new THREE.Clock();

    if (app.type == "tapjoy" && window.TJ_API) {
      window.TJ_API.setPlayableBuild("v1.0");
      window.TJ_API.setPlayableAPI({
        skipAd: function () {
          app.data.hasTryAgain = false;
          this.endGame(false);
        },
      });
    }

    assetManager.loadAssets(main, (list) => {
      this.assetList = list;
      main.assets = list;
      main.assetsLoaded();
    });
  }

  init(fromRestart) {
    confettiMaker = new Confetti(main.scene);
    this.initLights();
    this.initControls();

    this.cam = main.camera;
    this.cam.position.set(0, 20, -15);
    this.cam.lookAt(0, 0, 0);

    main.initCannonDebug();
    main.world.allowSleep = false;

    // this.level = new Level();
    // this.level.start();

    // / / /     C O D E   B E L O W     \ \ \ \\

    let red = 0xff0000;
    let cyan = 0x68f0f0;
    let gray = 0x393537;
    let rows = 12;
    let columns = 4;

    // Add red path

    let pathGeo = new THREE.BoxGeometry(10, 2, 150);
    let pathMat = new THREE.MeshBasicMaterial({
      color: red,
    });
    this.path = new THREE.Mesh(pathGeo, pathMat);

    this.path.position.set(0, 0, 0);
    main.scene.add(this.path);
    this.path.body = new Body({
      position: this.path.position,
      mass: 0,
    });
    let pathShape = new Box(new Vec3(5, 1, 25)); //cannonjs
    this.path.body.addShape(pathShape);
    main.world.add(this.path.body);
    //console.log(this.path);

    // Gets path position x,y,z

    let pathVec = new Vector3(); // threejs
    let path3 = new Box3().setFromObject(this.path);
    let pathSize = path3.getSize(pathVec);

    // Add cyan platform

    let plat = new Vec3(pathSize.x * 0.8, 1, 1.5);
    let platGeo = new THREE.BoxGeometry(plat.x, plat.y, plat.z);
    let platMat = new THREE.MeshPhongMaterial({
      color: cyan,
    });

    this.platform = new THREE.Mesh(platGeo, platMat);
    this.platform.position.set(0, 2, 5);
    main.scene.add(this.platform);

    this.platform.body = new Body({
      position: this.platform.position,
      mass: 1,
    });

    let platformShape = new Box(plat.mult(0.5));
    this.platform.body.addShape(platformShape);
    main.world.add(this.platform.body);

    // Add cyan ball

    let ballGeo = new THREE.SphereGeometry(0.7, 50, 50);
    let ballMat = new THREE.MeshPhongMaterial({
      color: cyan,
    });
    this.ball = new THREE.Mesh(ballGeo, ballMat);

    this.ball.position.set(0, 2, -5);
    main.scene.add(this.ball);

    this.ball.body = new Body({
      position: this.ball.position,
      mass: 30,
    });
    let ballShape = new Sphere(0.7);
    this.ball.body.addShape(ballShape);
    main.world.add(this.ball.body);

    //console.log(this.ball);

    // Add gray boxes

    let boxGeo = new THREE.BoxGeometry(1, 1, 1);
    let boxMat = new THREE.MeshPhongMaterial({
      color: gray,
    });
    this.box = new THREE.Mesh(boxGeo, boxMat);

    this.boxList = [];

    // Gets box position x,y,z

    let boxVec = new Vector3();
    let box3 = new Box3().setFromObject(this.box);
    let boxSize = box3.getSize(boxVec);

    // Placing boxes on the platform

    for (let i = 0; i < columns; i++) {
      for (let j = 0; j < rows; j++) {
        let x = 3.7 - i * (boxSize.x * 2.5);
        let z = 10 + j * (boxSize.z * 2.5);
        let y = 2;

        boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        boxMat = new THREE.MeshPhongMaterial({
          color: gray,
        });

        this.box = new THREE.Mesh(boxGeo, boxMat);
        this.box.position.set(x, y, z);
        main.scene.add(this.box);

        this.box.body = new Body({
          position: this.box.position,
          mass: 1,
        });
        let boxShape = new Box(new Vec3(0.6, 0.6, 0.6));
        this.box.body.addShape(boxShape);
        main.world.add(this.box.body);

        this.boxList.push(this.box);
      }
    }
    console.log(this.boxList);

    if (fromRestart) {
      return;
    }

    // window.main = main;
    // window.THREE = THREE;

    // Call these functions once

    updateFunction = this.update.bind(this);
    this.initUi();
    this.update();
    this.initTouchEvents();

    // this.onResizeCallback(main.lastWidth, main.lastHeight);
    // setTimeout(() => {
    //   this.onResizeCallback(main.lastWidth, main.lastHeight);
    // }, 500);
  }

  initControls() {
    controls = main.utility.initControls();
    //controls = main.utility.initControlsPointer(); ///for pepjs
    app.controls = controls;

    if (isTest) {
      isTest = false;
      window.onkeydown = function (e) {
        if (e.key == "a" && !isTest) {
          isTest = true;
          controls = main.utility.startOrbitControls(0, 1500);
        }

        if (e.key == "s" && isTest) {
          isTest = false;
          controls.dispose && controls.dispose();
        }
        main.isTest = isTest;
      };
    }
  }

  initUi() {
    let uiDiv = document.getElementById("ui");
    ui = new Ui(uiDiv);
    ui.prepare();
  }

  update() {
    main.update();
    requestAnimationFrame(updateFunction);

    var delta = clock.getDelta();
    if (!delta || isNaN(delta)) delta = 0.01;
    if (delta > 0.03) delta = 0.03;
    var ratio = delta * 60;

    this.ball.position.copy(this.ball.body.position);
    this.ball.quaternion.copy(this.ball.body.quaternion);

    this.platform.position.copy(this.platform.body.position);
    this.platform.quaternion.copy(this.platform.body.quaternion);

    this.path.position.copy(this.path.body.position);
    this.path.quaternion.copy(this.path.body.quaternion);

    for (let boxes of this.boxList) {
      boxes.position.copy(boxes.body.position);
      boxes.quaternion.copy(boxes.body.quaternion);
    }

    let controls = app.controls;

    if (controls.isDown) {
      console.log("mert");
      console.log(this.ball.position);
      let dx = controls.prevX - controls.mouseX;
      let dz = 1;

      dx *= 0.1;
      dz *= 0.5;

      this.ball.body.velocity.x += dx;
      this.ball.body.velocity.z += dz;
      this.cam.position.z += dz / 4;
    }

    // this.level.update(ratio, delta);

    confettiMaker && confettiMaker.update();

    main.CANNON && main.CANNON.cannonDebugRenderer && main.CANNON.cannonDebugRenderer.update();
    main.world && main.world.step(delta);
    main.renderer.render(main.scene, main.camera);
  }

  onResizeCallback() {
    if (!main) {
      return;
    }
    let w = window.innerWidth;
    let h = window.innerHeight;

    app.w = w;
    app.h = h;

    if (ui) {
      ui.resize(w, h);
    }
  }

  initLights() {
    let lightColor = 0xffffff;

    let ambientLight = new THREE.AmbientLight(lightColor, 0.2); //0.7
    main.scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(-300, 1000, 0);
    main.scene.add(dirLight);
  }

  initTouchEvents() {
    function pointerDown(e) {
      let install = ui.install;
      let bottomBanner = ui.bottomBanner;

      if (install && !install.classList.contains("show")) {
        install.classList.add("show");
        install.resize && install.resize();
      }

      if (bottomBanner && !bottomBanner.classList.contains("show")) {
        bottomBanner.classList.add("show");
        bottomBanner.resize && bottomBanner.resize();
      }

      if (!main.timeStarted && app.type != "mobvista") {
        main.startTimer();
      }
    }

    function pointerUp(e) {}

    let domElement = document.body;

    ///pointer events require pepjs on safari
    /*domElement.addEventListener("pointerdown", pointerDown);
        domElement.addEventListener("pointerup", pointerUp);
        domElement.addEventListener("pointermove", pointerMove);*/

    domElement.addEventListener("touchstart", pointerDown);
    domElement.addEventListener("touchend", pointerUp);

    if ("ontouchstart" in document.documentElement) {
    } else {
      domElement.addEventListener("mousedown", pointerDown);
      domElement.addEventListener("mouseup", pointerUp);
    }
  }

  endGame(didWon, reason) {
    if (gameEnded) {
      return;
    }

    gameEnded = true;
    main.gameEnded = true;

    ui.addEndCard();
    ////Call this part if the game is completely ended

    if (app.type == "tapjoy" && window.TJ_API) {
      if (didWon) {
        window.TJ_API && window.TJ_API.objectiveComplete();
      }
      window.TJ_API && window.TJ_API.gameplayFinished();

      if (window.TJ_API && window.TJ_API.directives.showEndCard) {
        // render end card
      } else {
        /* prepare for Tapjoy endcard */
        return;
      }
    }

    main.gameFinished(didWon, reason);
  }

  restartGame() {
    main.restartGame(data.totalTime);

    gameEnded = false;
    main.gameEnded = false;
    let scene = main.scene;

    for (var i = scene.children.length - 1; i >= 0; i--) {
      let obj = scene.children[i];
      scene.remove(obj);
      if (obj.body) {
        if (main.CANNON) {
          main.world.remove(obj.body);
        } else if (main.matter) {
          main.mater.removeBody(obj.body);
        }
      }
    }

    main.objectMaker.clear();
    this.init(true);
  }
}

export default Game;
