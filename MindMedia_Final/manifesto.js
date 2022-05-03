let camera3D, scene, renderer
let myCanvas, myVideo;
let people = {};  //make it an associatvie array with each person labeled by network id
let p5lm 

let dir = 0.01;
let positionLimit = 40;
let mixer, mixer2;

const clock = new THREE.Clock();

let onPointerDownLon;
let onPointerDownLat;

function setup() {
    console.log("setup");
    myCanvas = createCanvas(512, 512);
    myCanvas.hide();
    createPullDownForCameraSelection();
    //let captureConstraints =  allowCameraSelection(myCanvas.width,myCanvas.height) ;
    //myVideo = createCapture(captureConstraints, videoLoaded);
    //below is simpler if you don't need to select Camera because default is okay
    myVideo = createCapture(VIDEO, videoLoaded);
    myVideo.size(myCanvas.width, myCanvas.height);
    myVideo.elt.muted = true;
    myVideo.hide()

    init3D();

    //create the local thing
    creatNewVideoObject(myVideo, "me");
}


function videoLoaded(stream) {
    p5lm = new p5LiveMedia(this, "CAPTURE", stream, "mycrazyroomname")
    p5lm.on('stream', gotStream);
    p5lm.on('data', gotData);
    p5lm.on('disconnect', gotDisconnect);
}

function gotData(data, id) {
    // If it is JSON, parse it
    let d = JSON.parse(data);
    positionOnCircle(d.angleOnCircle, people[id].object);
}

function gotStream(videoObject, id) {
    //this gets called when there is someone else in the room, new or existing
    videoObject.hide();  //don't want the dom object, will use in p5 and three.js instead
    //get a network id from each person who joins
    creatNewVideoObject(videoObject, id);
}

function gotDisconnect(id) {
    people[id].videoObject.remove(); //dom version
    scene.remove(people[id].object); //three.js version
    delete people[id];  //remove from our variable
}

function creatNewVideoObject(videoObject, id) {  //this is for remote and local
    var videoGeometry = new THREE.CircleGeometry(100, 30);
    let myTexture = new THREE.Texture(videoObject.elt);  //NOTICE THE .elt  this give the element
    let videoMaterial = new THREE.MeshBasicMaterial({ map: myTexture, side: THREE.DoubleSide });
    videoMaterial.map.minFilter = THREE.LinearFilter;  //otherwise lots of power of 2 errors
    myAvatarObj = new THREE.Mesh(videoGeometry, videoMaterial);

    scene.add(myAvatarObj);

    //they can move that around but we need to put you somewhere to start
    angleOnCircle = positionOnCircle(null, myAvatarObj);

    //remember a bunch of things about each connection in json but we are really only using texture in draw
    //use an named or associate array where each oject is labeled with an ID
    people[id] = { "object": myAvatarObj, "texture": myTexture, "id": id, "videoObject": videoObject, "angleOnCircle": angleOnCircle };

}

function positionOnCircle(angle, thisAvatar) {
    //position it on a circle around the middle
    if (angle == null) { //first time
        angle = 2*Math.PI; 
    }
      //imagine a circle looking down on the world and do High School math
    let distanceFromCenter = 700;
    x = distanceFromCenter * Math.sin(angle);
    z = distanceFromCenter * Math.cos(angle);
    thisAvatar.position.set(x, 0, z);  //zero up and down
    thisAvatar.lookAt(0, 0, 0);  //oriented towards the camera in the center
    return angle;
}

function draw() {
    //go through all the people an update their texture, animate would be another place for this
    for(id in people){
        let thisPerson = people[id];
        if (thisPerson .videoObject.elt.readyState == thisPerson .videoObject.elt.HAVE_ENOUGH_DATA) {
            //check that the transmission arrived okay
            //then tell three that something has changed.
            thisPerson.texture.needsUpdate = true;
        }
    }
}

///move people around and tell them about 
function keyPressed() {
    let me = people["me"];
    if (keyCode == 37 || key == "a") {
        me.angleOnCircle += .01;

    } else if (keyCode == 39 || key == "d") {
        me.angleOnCircle -= .01;
    

    } else if (keyCode == 38 || key == "w") {

    } else if (keyCode == 40 || key == "s") {

    }
    positionOnCircle(me.angleOnCircle, me.object); //change it locally 
    //send it to others
    let dataToSend = { "angleOnCircle": me.angleOnCircle };
    p5lm.send(JSON.stringify(dataToSend));

}



function init3D() {
    scene = new THREE.Scene();
    camera3D = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 200, 0 );
    scene.add( hemiLight );

    const dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 200, 100 );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = - 100;
    dirLight.shadow.camera.left = - 120;
    dirLight.shadow.camera.right = 120;
    scene.add( dirLight );

    dirLight.shadow.mapSize.width = 900; // default
    dirLight.shadow.mapSize.height = 900; // default
    dirLight.shadow.camera.near = 0.5; // default
    dirLight.shadow.camera.far = 900; // default



    let bgGeometery = new THREE.SphereGeometry(900, 100, 40);
    //let bgGeometery = new THREE.CylinderGeometry(725, 725, 1000, 10, 10, true)
    bgGeometery.scale(-1, 1, 1);
    // has to be power of 2 like (4096 x 2048) or(8192x4096).  i think it goes upside down because texture is not right size
    let panotexture = new THREE.TextureLoader().load("hall.png");
    let backMaterial = new THREE.MeshBasicMaterial({ map: panotexture });

    let back = new THREE.Mesh(bgGeometery, backMaterial);
    scene.add(back);

    let stageGeo = new THREE.CylinderGeometry( 80, 80, 15, 32 );
    let stageMaterial = new THREE.MeshBasicMaterial( {color: 0xBF8B80} );
    let stage = new THREE.Mesh(stageGeo, stageMaterial);
    stage.position.y=-110;
    stage.position.z=200;
    //stage.castShadow = true;
    stage.receiveShadow = true;
    scene.add(stage)

    
    moveCameraWithMouse();

    camera3D.position.z = 0;

    const fbxLoader = new THREE.FBXLoader()
    
    fbxLoader.load('dance.fbx', function(object){
            mixer = new THREE.AnimationMixer( object );

            const action = mixer.clipAction( object.animations[ 0 ] );
            action.play();

            object.traverse( function ( child ) {
                if ( child.isMesh ) {

                    child.castShadow = true;
                    child.receiveShadow = true;
                }

            } );

            object.scale.set(0.5,0.5,0.5);
            object.position.set(-20, -100, 200);
            //object.lookAt(0, 0, 0);  //oriented towards the camera in the center
            scene.add(object)
        },

    )

    fbxLoader.load('dance2.fbx',function(object) {
            mixer2 = new THREE.AnimationMixer( object );

            const action = mixer2.clipAction( object.animations[ 0 ] );
            action.play();

            object.traverse( function ( child ) {
                if ( child.isMesh ) {

                    child.castShadow = true;
                    child.receiveShadow = true;
                }

            } );

            object.scale.set(0.45,0.45,0.45);
            object.position.set(30, -100, 200);
            //object.lookAt(0, 0, 0);  //oriented towards the camera in the center
            scene.add(object)
        },

    )

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if ( mixer ) mixer.update( delta );
    if (mixer2)mixer2.update(delta);
    renderer.render(scene, camera3D);
}

/////MOUSE STUFF  

var onMouseDownMouseX = 0, onMouseDownMouseY = 0;
var onPointerDownPointerX = 0, onPointerDownPointerY = 0;
var lon = -90, onMouseDownLon = 0; //start at -90 degrees for some reason
var lat = 0, onMouseDownLat = 0;
var isUserInteracting = false;


function moveCameraWithMouse() {
    document.addEventListener('keydown', onDocumentKeyDown, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('wheel', onDocumentMouseWheel, false);
    window.addEventListener('resize', onWindowResize, false);
    camera3D.target = new THREE.Vector3(0, 0, 0);
}

function onDocumentKeyDown(event) {
    //if (event.key == " ") {
    //in case you want to track key presses
    //}
}

function onDocumentMouseDown(event) {
    onPointerDownPointerX = event.clientX;
    onPointerDownPointerY = event.clientY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
    isUserInteracting = true;
}

function onDocumentMouseMove(event) {
    if (isUserInteracting) {
        lon = (onPointerDownPointerX - event.clientX) * 0.1 + onPointerDownLon;
        lat = (event.clientY - onPointerDownPointerY) * 0.1 + onPointerDownLat;
        computeCameraOrientation();
    }
}

function onDocumentMouseUp(event) {
    isUserInteracting = false;
}

function onDocumentMouseWheel(event) {
    camera3D.fov += event.deltaY * 0.05;
    camera3D.updateProjectionMatrix();
}

function computeCameraOrientation() {
    lat = Math.max(- 30, Math.min(30, lat));  //restrict movement
    let phi = THREE.Math.degToRad(90 - lat);  //restrict movement
    let theta = THREE.Math.degToRad(lon);
    camera3D.target.x = 10000 * Math.sin(phi) * Math.cos(theta);
    camera3D.target.y = 10000 * Math.cos(phi);
    camera3D.target.z = 10000 * Math.sin(phi) * Math.sin(theta);
    camera3D.lookAt(camera3D.target);
}


function onWindowResize() {
    camera3D.aspect = window.innerWidth / window.innerHeight;
    camera3D.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('Resized');
}

function allowCameraSelection(w, h) {
    //This whole thing is to build a pulldown menu for selecting between cameras

    //manual alternative to all of this pull down stuff:
    //type this in the console and unfold resulst to find the device id of your preferredwebcam, put in sourced id below
    //navigator.mediaDevices.enumerateDevices()

    //default settings
    let videoOptions = {
        audio: true, video: {
            width: w,
            height: h
        }
    };

    let preferredCam = localStorage.getItem('preferredCam')
    //if you changed it in the past and stored setting
    if (preferredCam) {
        videoOptions = {
            video: {
                width: w,
                height: h,
                sourceId: preferredCam
            }
        };
    }
    //create a pulldown menu for picking source
    navigator.mediaDevices.enumerateDevices().then(function (d) {
        var sel = createSelect();
        sel.position(10, 10);
        for (var i = 0; i < d.length; i++) {
            if (d[i].kind == "videoinput") {
                let label = d[i].label;
                let ending = label.indexOf('(');
                if (ending == -1) ending = label.length;
                label = label.substring(0, ending);
                sel.option(label, d[i].deviceId)
            }
            if (preferredCam) sel.selected(preferredCam);
        }
        sel.changed(function () {
            let item = sel.value();
            //console.log(item);
            localStorage.setItem('preferredCam', item);
            videoOptions = {
                video: {
                    optional: [{
                        sourceId: item
                    }]
                }
            };
            myVideo.remove();
            myVideo = createCapture(videoOptions, VIDEO);
            myVideo.hide();
            console.log("Preferred Camera", videoOptions);
        });
    });
    return videoOptions;
}
function createPullDownForCameraSelection() {
    //manual alternative to all of this pull down stuff:
    //type this in the console and unfold resulst to find the device id of your preferredwebcam, put in sourced id below
    //navigator.mediaDevices.enumerateDevices()
    preferredCam = localStorage.getItem('preferredCam')
    if (preferredCam) {
        videoOptions = {
            video: {
                width: myCanvas.width,
                height: myCanvas.height,
                sourceId: preferredCam
            }
        };
    } else {
        videoOptions = {
            audio: true, video: {
                width: myCanvas.width,
                height: myCanvas.height
            }
        };
    }
    navigator.mediaDevices.enumerateDevices().then(function (d) {
        var sel = createSelect();
        sel.position(10, 10);
        for (var i = 0; i < d.length; i++) {
            if (d[i].kind == "videoinput") {
                let label = d[i].label;
                let ending = label.indexOf('(');
                if (ending == -1) ending = label.length;
                label = label.substring(0, ending);
                sel.option(label, d[i].deviceId)
            }
            if (preferredCam) sel.selected(preferredCam);
        }
        sel.changed(function () {
            let item = sel.value();
            console.log(item);
            localStorage.setItem('preferredCam', item);
            videoOptions = {
                video: {
                    optional: [{
                        sourceId: item
                    }]
                }
            };
            myVideo.remove();
            myVideo = createCapture(videoOptions, VIDEO);
            myVideo.hide();
            console.log(videoOptions);
        });
    });
}
