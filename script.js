import * as THREE from "./lib/three.module.js";
import { OrbitControls } from "./lib/OrbitControls.js";
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
      y: 12.0,
      z: 20.0,
      lookAt: new THREE.Vector3(1.0, 0.0, 0.0),
    };
  }

  /**
   * レンダラー定義の定数
   */
  static get RENDERER_PARAM() {
    return {
      clearColor: 0xccdcda,
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
      intensity: 0.5,
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
      intensity: 0.2,
    };
  }

  /**
   * groundに関する定義
   */
  static get GROUND_PARAM() {
    return {
      size: 30,
      mass: 0,
      color: 0xacb3fb,
    };
  }

  /**
   * boxに関する定義
   */
  static get BOX_PARAM() {
    return {
      count: 400,
      size: 0.5,
      mass: 5,
      range: 3,
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
    this.directionalLight1;
    this.directionalLight2;
    this.hemisphereLight;
    this.spotLight;
    this.ambientLight;
    this.material;
    this.boxGeometry;
    this.boxMaterial;
    this.box;
    this.boxArray;

    this.groundGeometry;
    this.groundMaterial;
    this.ground;

    this.boxBody;
    this.boxBodyArray;
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
    this.AisDown = false;
    this.WisDown = false;
    this.SisDown = false;
    this.DisDown = false;

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
          case "a":
            this.AisDown = true;
            break;
          case "w":
            this.WisDown = true;
            break;
          case "s":
            this.SisDown = true;
            break;
          case "d":
            this.DisDown = true;
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
            break;
          case "a":
            this.AisDown = false;
            break;
          case "w":
            this.WisDown = false;
            break;
          case "s":
            this.SisDown = false;
            break;
          case "d":
            this.DisDown = false;
            break;
          default:
        }
      },
      false
    );

    // SPボタンイベント
    document.querySelector(".a").addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.AisDown = true;
    });
    document.querySelector(".a").addEventListener("touchend", (e) => {
      e.preventDefault();
      this.AisDown = false;
    });
    document.querySelector(".w").addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.WisDown = true;
    });
    document.querySelector(".w").addEventListener("touchend", (e) => {
      e.preventDefault();
      this.WisDown = false;
    });
    document.querySelector(".s").addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.SisDown = true;
    });
    document.querySelector(".s").addEventListener("touchend", (e) => {
      e.preventDefault();
      this.SisDown = false;
    });
    document.querySelector(".d").addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.DisDown = true;
    });
    document.querySelector(".d").addEventListener("touchend", (e) => {
      e.preventDefault();
      this.DisDown = false;
    });
    document.querySelector(".drop").addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.isDown = true;
    });

    // リサイズイベント
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setPixelRatio(window.devicePixelRatio);
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
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(App3.RENDERER_PARAM.clearColor);
    this.renderer.setSize(
      App3.RENDERER_PARAM.width,
      App3.RENDERER_PARAM.height
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.directionalLight1 = new THREE.DirectionalLight(
      App3.DIRECTIONAL_LIGHT_PARAM.color,
      App3.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight1.position.set(9.5, 8.2, 8.3);
    this.scene.add(this.directionalLight1);

    this.directionalLight2 = new THREE.DirectionalLight(
      App3.DIRECTIONAL_LIGHT_PARAM.color,
      App3.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight2.position.set(-15.0, 5.2, 8.0);
    this.scene.add(this.directionalLight2);

    // アンビエントライト
    this.ambientLight = new THREE.AmbientLight(
      App3.AMBIENT_LIGHT_PARAM.color,
      App3.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // ヘミスフィアライト
    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xd0e040, 0.2);
    this.scene.add(this.hemisphereLight);

    this.spotLight = new THREE.SpotLight(
      0xffffff,
      0.5,
      1000,
      Math.PI * 0.3,
      1,
      80
    );
    this.spotLight.position.set(5.0, 20.0, 3.0);
    this.spotLight.castShadow = true;
    this.scene.add(this.spotLight);

    /**
     * ground生成
     */
    // gourndBody
    this.groundBody = new CANNON.Body({
      mass: App3.GROUND_PARAM.mass,
      position: new CANNON.Vec3(0, -0.5, 0),
    });
    // this.groundBody.addShape(new CANNON.Plane());
    this.groundBody.addShape(
      new CANNON.Box(
        new CANNON.Vec3(
          App3.GROUND_PARAM.size / 2,
          App3.GROUND_PARAM.size / 2,
          0.5
        )
      )
    );
    this.groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );

    // groundMesh
    this.groundGeometry = new THREE.BoxGeometry(
      App3.GROUND_PARAM.size,
      App3.GROUND_PARAM.size,
      0.05
    );
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: App3.GROUND_PARAM.color,
      side: THREE.DoubleSide,
    });
    this.ground = new THREE.Mesh(this.groundGeometry, this.groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.castShadow = true;
    this.ground.receiveShadow = true;
    this.ground.position.y = 0;

    this.scene.add(this.ground);
    this.world.addBody(this.groundBody);

    // box マテリアル
    this.boxMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
    });

    /**
     * boxを複数生成
     */
    this.boxArray = [];
    this.boxBodyArray = [];

    for (let i = 0; i < App3.BOX_PARAM.count; i++) {
      //座標をランダムに散らす（Yは固定）
      let positionX = (Math.random() * 2.0 - 1.0) * App3.BOX_PARAM.range;
      let positionY = Math.random() * 2.0 + 1.0 + i + 0.2;
      let positionZ = (Math.random() * 2.0 - 1.0) * App3.BOX_PARAM.range;

      // boxBody
      const boxBody = new CANNON.Body({
        mass: App3.BOX_PARAM.mass,
        position: new CANNON.Vec3(positionX, positionY, positionZ),
        shape: new CANNON.Box(
          new CANNON.Vec3(
            App3.BOX_PARAM.size / 2,
            App3.BOX_PARAM.size / 2,
            App3.BOX_PARAM.size / 2
          )
        ),
      });
      // 回転追加
      boxBody.angularVelocity.set(Math.random(), Math.random(), 0);

      // boxMesh
      this.boxGeometry = new THREE.BoxGeometry(
        App3.BOX_PARAM.size,
        App3.BOX_PARAM.size,
        App3.BOX_PARAM.size
      );
      const box = new THREE.Mesh(this.boxGeometry, this.boxMaterial);
      box.castShadow = true;
      box.receiveShadow = true;
      box.position.set(positionX, positionY, positionZ);

      // this.world.addBody(boxBody);
      this.scene.add(box);

      this.boxArray.push(box);
      this.boxBodyArray.push(boxBody);
    }

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // ヘルパー
    // gridHelper
    // const gridHelperSize = App3.GROUND_PARAM.size;
    // const gridHelperDivisions = App3.GROUND_PARAM.size;
    // this.gridHelper = new THREE.GridHelper(gridHelperSize, gridHelperDivisions);
    // this.scene.add(this.gridHelper);

    // axesHelper
    // const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // DirectionalLightHelper
    // const directionalLightHelperSize = 1;
    // this.directionalLightHelper = new THREE.DirectionalLightHelper(
    //   this.directionalLight,
    //   directionalLightHelperSize
    // );
    // this.scene.add(this.directionalLightHelper);
  }

  /**
   * 描画処理
   */
  render(time) {
    requestAnimationFrame(this.render);

    if (this.isDown === true) {
      for (let i = 0; i < App3.BOX_PARAM.count; i++) {
        this.world.addBody(this.boxBodyArray[i]);
        this.boxArray[i].position.copy(this.boxBodyArray[i].position);
        this.boxArray[i].quaternion.copy(this.boxBodyArray[i].quaternion);
      }
    }

    if (this.AisDown === true) {
      this.ground.rotation.y -= 0.01;
    }
    if (this.WisDown === true) {
      this.ground.rotation.x -= 0.01;
    }
    if (this.SisDown === true) {
      this.ground.rotation.x += 0.01;
    }
    if (this.DisDown === true) {
      this.ground.rotation.y += 0.01;
    }

    this.groundBody.quaternion.set(
      this.ground.quaternion.x,
      this.ground.quaternion.y,
      this.ground.quaternion.z,
      this.ground.quaternion.w
    );

    if (this.lastTime !== undefined) {
      var dt = (time - this.lastTime) / 1000;
      this.world.step(this.fixedTimeStep, dt, this.maxSubSteps);
    }

    this.lastTime = time;
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }
}
