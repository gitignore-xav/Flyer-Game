class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	get sqrMagnitude() {
		return this.x ** 2 + this.y ** 2;
	}
	
	get magnitude() {
		return Math.sqrt(this.sqrMagnitude);
	}

	get direction() {
		return Math.atan2(this.y, this.x);
	}

	setDirection(angle) {
		let magnitude = this.magnitude;
		this.x = Math.cos(angle) * magnitude;
		this.y = Math.sin(angle) * magnitude;
		return this;
	}

	setMagnitude(magnitude) {
		let angle = this.direction;
		this.x = Math.cos(angle) * magnitude;
		this.y = Math.sin(angle) * magnitude;
		return this;
	}


	static get zero() {
		return new Vector(0, 0);
	}

	static get random() {
		let v = new Vector(0, 0);
		v.setMagnitude(1);
		v.setDirection(Utility.randomRange(-Math.PI*2, Math.PI*2));
		
		return v;
	}
}

class Input {
	static keys = new Set();
	static pressed = new Set();
	static released = new Set();
}
document.addEventListener('keydown', (event) => {
	if(event.repeat) return;
	
	Input.keys.add(event.code);
	Input.pressed.add(event.code)
});
document.addEventListener('keyup', (event) => {
	if(event.repeat) return;
	
	Input.keys.delete(event.code);
	Input.released.add(event.code);
});

class Utility {
	static randomRange(min, max) {
		return Math.random() * (max - min + 1) + min;
	}

	static randomRangeInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min)
	}

	static get uniqueId() {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		  );
	}
}

class Scene {
	constructor(load) {
		this.load = load ?? (() => {});
	}
}

const app = new PIXI.Application({ 
	antialias: true,
	
	width: 350, 
	height: 350
});
document.body.appendChild(app.view);


let elapsed = 0.0;
class World {
	static timeScale = 1;

	magnitude = 0;
	static offset = {
		x: 0,
		y: 0
	}
	static shake(magnitude, m) {
		this.offset.x = magnitude;
		this.offset.y = -magnitude;
		this.magnitude = m;
	}

	static canvas = {
		width: 350,
		height: 350
	}
	
	static time = 0;
	static Masks = {
		Default: 0x0001
	}
	
	static objects = [];
	static scenes = {};

	static #removeNonPersistent() {
		for(let i = World.objects.length-1; i >= 0; i--) {
			let obj = World.objects[i];
			
			if(!obj.persistent) {
				obj.onDestroy();
				World.objects.splice(i, 1);
			}
		}
	}

	static loadScene(sceneName) {
		if(!World.scenes.hasOwnProperty(sceneName)) return;
		this.#removeNonPersistent();

		World.scenes[sceneName].load();
	}
}


class Collider {
	type = Collider.Types.Default;
	static Types = {
		Default: 0x0001,
		Rectangle: 0x0002,
		Circle: 0x0004
	}
	constructor() {}

	toC(pos) { return { type: this.type, x: pos.x, y: pos.y } }
	
	collidesWith(ca, cb) {
		const a = this.type;
		const b = cb.type;

		switch(a | b) {
			case Collider.Types.Rectangle | Collider.Types.Rectangle:
				return Collider.AABB(ca, cb);

			case Collider.Types.Rectangle | Collider.Types.Circle:
				return Collider.AABBC(ca, cb);

			case Collider.Types.Circle | Collider.Types.Rectangle:
				return Collider.AABBC(cb, ca);

			case Collider.Types.Circle | Collider.Types.Circle:
				return Collider.CC(ca, cb);
			
			default:
				return false;
		}
	}

	static AABB(a, b) {
		return (a.x <= b.x + b.width) && 
			(a.x + a.width >= b.x) &&
			(a.y <= b.y + b.height) &&
			(a.y + a.height >= b.y);
	}

	static CC(a, b) {
		// I think
		return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) <= a.radius + b.radius;
	}

	static AABBC(rect, circle) {
		let distX = Math.abs(circle.x - rect.x-rect.width/2);
		let distY = Math.abs(circle.y - rect.y-rect.height/2);

		if(distX > (rect.width/2 + circle.radius)) return false;
		if(distY > (rect.height/2 + circle.radius)) return false;

		if(distX <= (rect.width/2)) return true;
		if(distY <= (rect.height/2)) return true;

		let dx = distX - rect.width/2;
		let dy = distY - rect.height/2;
		return (dx**2 + dy**2 <= (circle.radius));
	}
}

class Rectangle extends Collider {
	type = Collider.Types.Rectangle;
	constructor(width, height) {
		super();
		
		this.width = width ?? 25;
		this.height = height ?? 25;
	}

	toC(pos) { 
		return { 
			type: this.type,
			x: pos.x, 
			y: pos.y,
			width: this.width,
			height: this.height
		};
	}
}

class Circle extends Collider {
	type = Collider.Types.Circle;
	constructor(radius) {
		super();
		
		this.radius = radius ?? 12.5;
	}

	toC(pos) { 
		return { 
			type: this.type,
			x: pos.x, 
			y: pos.y,
			radius: this.radius
		};
	}
}


class GameObject {
	position = { x: 0, y: 0 };
	layer = World.Masks.Default;
	mask = World.Masks.Default;
	toDestroy = false;
	persistent = false;
	id = Utility.id;
	collider = new Rectangle(25, 25);
	graphics = new PIXI.Graphics();
	z = 0;
	
	constructor() {}

	destroy() {
		this.onDestroy();
		this.toDestroy = true;
	}

	onDestroy() {
		this.graphics.destroy();
	}

	setPosition(x, y) {
		this.position.x = x;
		this.position.y = y;
		
		return this;
	}
	
	setColldier(w, h) {
		this.collider.width = w;
		this.collider.height = h;
		
		return this;
	}

	start() {}
	update() {}
	draw() {}
}

function Instantiate(obj) {
	if(!(obj instanceof GameObject)) {
		console.error('Can only Instantiate GameObjects.');
		return;
	}
	
	World.objects.push(obj);
	obj.start();
}