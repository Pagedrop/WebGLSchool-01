import * as THREE from "./lib/three.module.js";
import { OrbitControls } from "../lib/OrbitControls.js";
import * as CANNON from "./lib/cannon-es.js";

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const app = new App3();

    app.init();

    app.render();
  },
  false
);

class App3 {
  /**
   * カメラ定義の定数
   */
  static get CAMERA_PARAM() {
    return {
      fovy: 60,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 100000,
      x: 0.0,
      y: 5.0,
      z: 20.0,
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }

  /**
   * レンダラー定義の定数
   */
  static get RENDERER_PARAM() {
    return {
      clearColor: 0x333333,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * ディレクショナルライト定義の定数
   */
  static get DIRECTIONAL_LIGHT_PARAM() {
    return {
      color: 0xffffff,
      intensity: 1.0,
      x: 2.0,
      y: 2.0,
      z: 2.0,
    };
  }

  /**
   * アンビエントライト定義の定数
   */
  static get AMBIENT_LIGHT_PARAM() {
    return {
      color: 0xffffff,
      intensity: 1,
    };
  }

  /**
   * マテリアル定義の定数
   */
  static get MATERIAL_PARAM() {
    return {
      color: 0x3399ff,
    };
  }

  /**
   * コンストラクタ
   * @constructor
   */
  constructor() {
    this.renderer;
    this.scene;
    this.camera;
    this.directionalLight;
    this.ambientLight;
    this.material;
    this.boxGeometry;
    this.boxMaterial;
    this.box;
    this.groundGeometry;
    this.groundMaterial;
    this.ground;

    this.boxBody;
    this.groundBody;
    this.fixedTimeStep = 1.0 / 60.0;
    this.maxSubSteps = 3;
    this.lastTime;

    this.controls;

    // ヘルパー
    this.axesHelper;
    this.gridHelper;
    this.directionalLightHelper;

    this.world;

    this.isDown = false;

    // 再帰呼び出しの為のthis固定
    this.render = this.render.bind(this);

    /**
     * イベント
     */

    // キーイベント
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
            break;
          default:
        }
      },
      false
    );
    window.addEventListener(
      "keyup",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = false;
            break;
          default:
        }
      },
      false
    );

    // リサイズイベント
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   * 初期化処理
   */
  init() {
    // 物理演算ワールド
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    //レンダラー
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(App3.RENDERER_PARAM.clearColor);
    this.renderer.setSize(
      App3.RENDERER_PARAM.width,
      App3.RENDERER_PARAM.height
    );
    const wrapper = document.querySelector("#webgl");
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      App3.CAMERA_PARAM.fovy,
      App3.CAMERA_PARAM.aspect,
      App3.CAMERA_PARAM.near,
      App3.CAMERA_PARAM.far
    );
    this.camera.position.set(
      App3.CAMERA_PARAM.x,
      App3.CAMERA_PARAM.y,
      App3.CAMERA_PARAM.z
    );
    this.camera.lookAt(App3.CAMERA_PARAM.lookAt);

    // ディレクショナルライト
    this.directionalLight = new THREE.DirectionalLight(
      App3.DIRECTIONAL_LIGHT_PARAM.color,
      App3.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.set(
      App3.DIRECTIONAL_LIGHT_PARAM.x,
      App3.DIRECTIONAL_LIGHT_PARAM.y,
      App3.DIRECTIONAL_LIGHT_PARAM.z
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト
    this.ambientLight = new THREE.AmbientLight(
      App3.AMBIENT_LIGHT_PARAM.color,
      App3.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // ジオメトリ
    this.boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);

    /**
     * 平面生成
     */
    // 平面body
    this.groundBody = new CANNON.Body({
      mass: 0,
    });
    this.groundBody.addShape(new CANNON.Plane());
    this.groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    // 平面mesh
    this.groundGeometry = new THREE.PlaneGeometry(20, 20);
    this.groundMaterial = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      side: THREE.DoubleSide,
    });
    this.ground = new THREE.Mesh(this.groundGeometry, this.groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;

    this.scene.add(this.ground);
    this.world.addBody(this.groundBody);

    /**
     * 箱生成
     */
    // 箱body
    this.boxBody = new CANNON.Body({
      mass: 5,
      position: new CANNON.Vec3(0, 10, 0),
      shape: new CANNON.Box(new CANNON.Vec3(1 / 2, 1 / 2, 1 / 2)),
    });
    // 回転追加
    this.boxBody.angularVelocity.set(Math.random(), Math.random(), 0);
    // 箱mesh
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa0000,
    });
    this.box = new THREE.Mesh(this.boxGeometry, this.boxMaterial);
    this.box.position.set(0, 10, 0);
    this.scene.add(this.box);
    this.world.addBody(this.boxBody);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    // gridHelper
    const gridHelperSize = 20;
    const gridHelperDivisions = 20;
    this.gridHelper = new THREE.GridHelper(gridHelperSize, gridHelperDivisions);
    this.scene.add(this.gridHelper);

    // axesHelper
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // DirectionalLightHelper
    const directionalLightHelperSize = 1;
    this.directionalLightHelper = new THREE.DirectionalLightHelper(
      this.directionalLight,
      directionalLightHelperSize
    );
    this.scene.add(this.directionalLightHelper);
  }

  /**
   * 描画処理
   */
  render(time) {
    requestAnimationFrame(this.render);

    if (this.isDown === true) {
      this.box.rotation.y += 0.02;
    }

    if (this.lastTime !== undefined) {
      var dt = (time - this.lastTime) / 1000;
      this.world.step(this.fixedTimeStep, dt, this.maxSubSteps);
    }
    // console.log("Sphere z position: " + this.sphere.position.z);
    this.lastTime = time;
    this.controls.update();
    this.box.position.copy(this.boxBody.position);
    this.box.quaternion.copy(this.boxBody.quaternion);

    this.renderer.render(this.scene, this.camera);
  }
}
