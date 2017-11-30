'use strict';

document.exitPointerLock = document.exitPointerLock    ||
                           document.mozExitPointerLock;

window.onload = init;

var mainScene, hudScene;
var mainCamera, mainRenderer;
var fpsCamera;

var mouse = new THREE.Vector2();

var muted = false, paused = true;

var loader = new THREE.JSONLoader();

var floor, wallLeft, wallRight, wallBack, wallFront, ceiling, stage, bigWindow, door;

var candles = [];
var candleYs = [];
var clock = new THREE.Clock();

var boundingBoxes = [];
var boxVisuals = [];

var music, footsteps;

var moveFore = false, moveBack = false, moveLeft = false, moveRight = false;

var loadersRunning = 0;
var loaded = false;
var expandedBoxes = false;

function init(){

	initScene();
	initLights();

	initAudio();

	initMain();

	render();

}

function FPSCamera(camera){

	this.verticalObject = new THREE.Object3D();
	this.verticalObject.add(camera);

	this.horizontalObject = new THREE.Object3D();
	this.horizontalObject.add(this.verticalObject);

	mainScene.add(this.horizontalObject);
	this.horizontalObject.position.y = 0.7;
	this.horizontalObject.position.z = -3;

	this.PI_2 = Math.PI / 2;

	this.horizontalObject.rotation.y = this.PI_2 * 2;

	this.onMouseMove = function ( event ) {

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		this.horizontalObject.rotation.y -= movementX * 0.01;
		this.verticalObject.rotation.x -= movementY * 0.01;

		this.verticalObject.rotation.x = Math.max( - this.PI_2, Math.min( this.PI_2, this.verticalObject.rotation.x ) );

	};

	this.move = function( speed ){

		var delta = new THREE.Vector3();

		if( moveFore ){
			delta = new THREE.Vector3( 0, 0, -speed );
			delta.applyQuaternion( this.horizontalObject.quaternion );
		}else if( moveBack){
			delta = new THREE.Vector3( 0, 0, speed );
			delta.applyQuaternion( this.horizontalObject.quaternion );
		}

		this.safeMove( delta.clone() );

		if( moveLeft ){
			delta = new THREE.Vector3( -speed, 0, 0 );
			delta.applyQuaternion( this.horizontalObject.quaternion );
		}else if( moveRight ){
			delta = new THREE.Vector3( speed, 0, 0 );
			delta.applyQuaternion( this.horizontalObject.quaternion );
			
		}

		this.safeMove( delta.clone() );
		
	}

	this.safeMove = function( delta ){

		delta.y *= 0.5;

		this.horizontalObject.position.y *= 0.5

		for( var i = 0; i < boundingBoxes.length; i++ ){

			if( boundingBoxes[i].containsPoint(delta.clone().add(this.horizontalObject.position)) ){

				/*var dist = boundingBoxes[i].distanceToPoint( this.horizontalObject.position );
				dist *= 0.9;

				delta.setLength( dist );
				this.horizontalObject.position.add( delta );*/

				this.horizontalObject.position.y /= 0.5;

				return;
			}

		}

		this.horizontalObject.position.add( delta );
		this.horizontalObject.position.y /= 0.5;

	}

}

var onKeyDown = function ( event ) {

	var requestedElement = mainRenderer.domElement;

	if (document.pointerLockElement === requestedElement || document.mozPointerLockElement === requestedElement || document.webkitPointerLockElement === requestedElement ){
		switch ( event.keyCode ) {
			case 87: // w
				moveBack = false;
				moveFore = true;
				break;
			case 65: // a
				moveRight = false;
				moveLeft = true; 
				break;
			case 83: // s
				moveFore = false;
				moveBack = true;
				break;
			case 68: // d
				moveLeft = false;
				moveRight = true;
				break;
			case 69: // e
				for(var i = 0; i < boxVisuals.length; i++)
					boxVisuals[i].visible = !boxVisuals[i].visible;
				break;
		}

		if( moveFore || moveBack || moveLeft || moveRight )
			footsteps.play();
	}

};

var onKeyUp = function ( event ) {

	switch( event.keyCode ) {
		case 87: // w
			moveFore = false;
			break;
		case 65: // a
			moveLeft = false;
			break;
		case 83: // s
			moveBack = false;
			break;
		case 68: // d
			moveRight = false;
			break;
	}

	if( !moveFore && !moveBack && !moveLeft && !moveRight )
		footsteps.pause();

};

document.addEventListener( 'keydown', onKeyDown, false );
document.addEventListener( 'keyup', onKeyUp, false );

var candleLightMaterial = new THREE.MeshPhongMaterial({color: 0xFF9000, emissive: 0xFF9000});

function createCandle( geometry, materials, position, scale ){

	scale = (typeof scale === 'undefined') ? new THREE.Vector3(0.04,0.04,0.04) : scale;

	var candle = new THREE.Mesh(geometry, materials);
	var ball = new THREE.Mesh(new THREE.SphereGeometry( 0.1, 5, 5 ), candleLightMaterial);
	var light = new THREE.PointLight( 0xff9000, 0.21, 5 );
	//light.castShadow = true;

	ball.position.y = 2;
	light.position.y = 2;

	ball.scale.y = 2.5;

	candle.scale.copy(scale);

	candle.add(ball);
	candle.add(light);

	candle.position.copy(position);

	candles.push(candle);
	candleYs.push(candle.position.y);

	mainScene.add(candle);

}

function initScene(){

	mainScene = new THREE.Scene();

	loadersRunning++;
	loader.load('./Models/Floor.json', function(geometry, materials){
		floor = new THREE.Mesh(geometry, materials);
		floor.receiveShadow = true;
		mainScene.add(floor);
		var box = new THREE.BoxHelper( wallLeft, 0xffff00 );
		mainScene.add( box );
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/Ceiling.json', function(geometry, materials){
		ceiling = new THREE.Mesh(geometry, materials);
		//ceiling.castShadow = true;
		mainScene.add(ceiling);
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/WallLeft.json', function(geometry, materials){
		wallLeft = new THREE.Mesh(geometry, materials);
		mainScene.add(wallLeft);
		boundingBoxes.push(new THREE.Box3().setFromObject(wallLeft));
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/WallBack.json', function(geometry, materials){
		wallBack = new THREE.Mesh(geometry, materials);
		mainScene.add(wallBack);
		boundingBoxes.push(new THREE.Box3().setFromObject(wallBack));
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/WallFront.json', function(geometry, materials){
		wallFront = new THREE.Mesh(geometry, materials);
		mainScene.add(wallFront);
		boundingBoxes.push(new THREE.Box3().setFromObject(wallFront));
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/WallRight.json', function(geometry, materials){
		wallRight = new THREE.Mesh(geometry, materials);
		mainScene.add(wallRight);
		boundingBoxes.push(new THREE.Box3().setFromObject(wallRight));
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/Stage.json', function(geometry, materials){
		var stage = new THREE.Mesh(geometry, materials);
		mainScene.add(stage);

		var box = new THREE.Box3();
		box.setFromCenterAndSize( new THREE.Vector3( 0, 0.25, 6 ), new THREE.Vector3( 3, 0.5, 3 ) );
		boundingBoxes.push( box );

		box = new THREE.Box3();
		box.setFromCenterAndSize( new THREE.Vector3( 2, 0.25, 6 ), new THREE.Vector3( 0.5, 0.5, 2 ) );
		boundingBoxes.push( box );

		box = new THREE.Box3();
		box.setFromCenterAndSize( new THREE.Vector3( -2, 0.25, 6 ), new THREE.Vector3( 0.5, 0.5, 2 ) );
		boundingBoxes.push( box );

		box = new THREE.Box3();
		box.setFromCenterAndSize( new THREE.Vector3( 0, 0.25, 6 ), new THREE.Vector3( 10, 0.5, 1 ) );
		boundingBoxes.push( box );

		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/Door.json', function(geometry, materials){
		door = new THREE.Mesh(geometry, materials);
		mainScene.add(door);
		boundingBoxes.push(new THREE.Box3().setFromObject(door));
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/Podium.json', function(geometry, materials){
		var podium = new THREE.Mesh(geometry, materials);
		mainScene.add(podium);
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/BigWindow.json', function(geometry, materials){
		bigWindow = new THREE.Mesh(geometry, materials);
		mainScene.add(bigWindow);
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/candle.json', function(geometry, materials){
		
		for( var i = -4; i < 3; i++ ){

			createCandle(geometry, materials, new THREE.Vector3(0.8,1,1.5*i));
			createCandle(geometry, materials, new THREE.Vector3(-0.8,1,1.5*i));

			if( i % 2 == 0 && i != -4 ){
				createCandle(geometry, materials, new THREE.Vector3(4.5,2.5,1.975*i), new THREE.Vector3(0.08,0.2,0.08));
				createCandle(geometry, materials, new THREE.Vector3(-4.5,2.5,1.975*i), new THREE.Vector3(0.08,0.2,0.08));
			}

		}

		for( var i = -2; i < 3; i++ ){
			createCandle( geometry, materials, new THREE.Vector3(1.25, 5, 3.5*i ), new THREE.Vector3(0.08,0.2,0.08));
			createCandle( geometry, materials, new THREE.Vector3(-1.25, 5, 3.5*i ), new THREE.Vector3(0.08,0.2,0.08));
		}

		createCandle( geometry, materials, new THREE.Vector3(1.5, 1.5, 3.5*1.6 ), new THREE.Vector3(0.08,0.2,0.08));
		createCandle( geometry, materials, new THREE.Vector3(-1.5, 1.5, 3.5*1.6 ), new THREE.Vector3(0.08,0.2,0.08));

		loadersRunning--;

	});

	loadersRunning++;
	loader.load('./Models/SmallWindow1.json', function(geometry, materials){
		
		for( var i = -3; i < 4; i++ ){

			if( i % 2 != 0 ){

				var smallWindow = new THREE.Mesh(geometry, materials);
				smallWindow.position.set( 5.01, 3.31164, 1.975*i );
				smallWindow.rotation.y = -Math.PI/2;
				smallWindow.castShadow = true;
				mainScene.add(smallWindow);

				if( i != -3 ){
					smallWindow = new THREE.Mesh(geometry, materials);
					smallWindow.position.set( -5.01, 3.31164, 1.975*i );
					smallWindow.rotation.y = Math.PI/2;
					smallWindow.castShadow = true;
					mainScene.add(smallWindow);
				}

			}

			var smallWindow = new THREE.Mesh(geometry, materials);
			smallWindow.position.set( 2.25, 4.7, 7.83332);
			smallWindow.rotation.y = Math.PI;
			smallWindow.castShadow = true;
			mainScene.add(smallWindow);

			smallWindow = new THREE.Mesh(geometry, materials);
			smallWindow.position.set( -2.25, 4.7, 7.83332);
			smallWindow.rotation.y = Math.PI;
			smallWindow.castShadow = true;
			mainScene.add(smallWindow);

		}
		loadersRunning--;

	});

	loadersRunning++;
	loader.load('./Models/BrokenWindow.json', function(geometry, materials){
		var brokenWindow = new THREE.Mesh(geometry, materials);
		mainScene.add(brokenWindow);
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/Rubble.json', function(geometry, materials){
		var rubble = new THREE.Mesh(geometry, materials);
		boundingBoxes.push(new THREE.Box3().setFromObject(rubble));
		mainScene.add(rubble);
		loadersRunning--;
	});

	loadersRunning++;
	loader.load('./Models/beam.json', function(geometry, materials){
		
		for( var i = -2; i < 3; i++ ){
			var beam = new THREE.Mesh(geometry, materials);
			beam.position.set( 0, 6.82095, 3.95*i );
			beam.castShadow = true;
			mainScene.add(beam);
		}
		loadersRunning--;

	});

	loadersRunning++;
	loader.load('./Models/pew.json', function(geometry, materials){
		
		for( var i = -6; i < 4; i++ ){

			var pew = new THREE.Mesh(geometry, materials);
			pew.position.set( -1.8, 0.23, i );
			pew.castShadow = true;
			mainScene.add(pew);
			boundingBoxes.push(new THREE.Box3().setFromObject(pew));

			pew = new THREE.Mesh(geometry, materials);
			pew.position.set( 1.8, 0.23, i );

			if( i == 0 ){
				pew.position.y -= 0.3;
				pew.rotation.x = -0.2;
				pew.rotation.z = 0.3;
			}

			if( i == 1 ){
				pew.position.x -= 0.4;
				pew.position.y -= 0.3;
				pew.rotation.y = 1.5;
				pew.rotation.z = 0.2;
				pew.rotation.x = -0.05;
			}

			if( i == 2 ){
				pew.rotation.y = 0.2;
				pew.rotation.x = -0.1;
			}

			pew.castShadow = true;
			mainScene.add(pew);
			boundingBoxes.push(new THREE.Box3().setFromObject(pew));

			pew = new THREE.Mesh(geometry, materials);
			pew.position.set( 3.5, 0.23, i );
			pew.castShadow = true;
			mainScene.add(pew);
			boundingBoxes.push(new THREE.Box3().setFromObject(pew));

			pew = new THREE.Mesh(geometry, materials);
			pew.position.set( -3.5, 0.23, i );

			if( i == -6 ){
				pew.position.y += 0.2;
				pew.rotation.y = 0.3;
				pew.rotation.x = 0.2;
				pew.rotation.z = -0.3;
			}

			if( i == -5 ){
				pew.position.x -= 0.2;
				pew.position.z += 0.2;
				pew.rotation.x = 2.3;
			}

			pew.castShadow = true;
			mainScene.add(pew);
			boundingBoxes.push(new THREE.Box3().setFromObject(pew));

		}
		loadersRunning--;

	});

	var cube = new THREE.CubeTextureLoader();
	cube.setPath( './Textures/Sky/' );

	var textureCube = cube.load( [
		'posx.jpg', 'negx.jpg',
		'posy.jpg', 'negy.jpg',
		'posz.jpg', 'negz.jpg'
	] );

	mainScene.background = textureCube;

}

function initLights(){
	var ambientLight = new THREE.AmbientLight( 0x111105 );
	mainScene.add( ambientLight );
}

function initAudio(){

	footsteps = new Audio('Sounds/footstep.wav');
	footsteps.loop = true;

	music = new Audio('Sounds/myuu - Silent Night (Dark Piano Version).mp3');
	music.loop = true;

	music.play();

}

function initMain(){

	mainRenderer = new THREE.WebGLRenderer();
	mainRenderer.setClearColor( 0x050505, 1.0 );
	
	mainRenderer.shadowMap.enabled = true;
	mainRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

	mainCamera = new THREE.PerspectiveCamera( 45, 1, 0.1, 10000 );
	fpsCamera = new FPSCamera(mainCamera);

	$("#mainView").append( mainRenderer.domElement );

}

function resizeMain() {
	const w = document.body.clientWidth;
	const h = document.body.clientHeight;
    mainRenderer.setSize(w, h);
    mainCamera.aspect = w / h;
    mainCamera.updateProjectionMatrix();
}

function render(){

	if( loaded ){

		if( !expandedBoxes ){
			for( var i = 0; i < boundingBoxes.length; i++ ){
				boundingBoxes[i].expandByScalar(0.1);
				var helper = new THREE.Box3Helper( boundingBoxes[i], 0xffff00 );
				mainScene.add( helper );
				boxVisuals.push(helper);
				helper.visible = false;
			}
			expandedBoxes = true;
		}

	}else{

		if( loadersRunning == 0 )
			loaded = true;

	}

	for( var i = 0; i < candles.length; i++ ){
		candles[i].position.y = candleYs[i] + 0.1*Math.sin(clock.getElapsedTime() + i);
	}

	fpsCamera.move(0.02);

	resizeMain();
	mainRenderer.render( mainScene, mainCamera );

	requestAnimationFrame( render );

}

document.oncontextmenu = function() {
    return false;
}

$(document).ready(function(){

	$(document).click(onClick)

}.bind(this));

function onClick(){

	mainRenderer.domElement.requestPointerLock = mainRenderer.domElement.requestPointerLock || fpsRenderer.domElement.mozRequestPointerLock || fpsRenderer.domElement.webkitRequestPointerLock;
	mainRenderer.domElement.requestPointerLock();

}

window.addEventListener("mousemove", function(e){ handleMouseMovement(e); } , false);

function handleMouseMovement(e){

	var requestedElement = mainRenderer.domElement;

	if (document.pointerLockElement === requestedElement || document.mozPointerLockElement === requestedElement || document.webkitPointerLockElement === requestedElement )
		fpsCamera.onMouseMove(e);
	
}