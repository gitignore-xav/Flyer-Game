const glitch = new PIXI.filters.ShockwaveFilter();
const chromaticAbberation = new PIXI.filters.RGBSplitFilter();
const bloom = new PIXI.filters.AdvancedBloomFilter();

chromaticAbberation.red[0] = -3;
chromaticAbberation.green[1] = 3;

app.stage.filterArea = app.screen;
app.stage.filters = [glitch, chromaticAbberation, bloom];

class Player extends GameObject {
	points     = 0;
	speed      = 1.5;
	gravity    = 0.12;
	jumpHeight = 40;
	collider   = new Rectangle(20, 20);
	friction   = new Vector(0.7, 1);

	accel    = Vector.zero;
	velocity = Vector.zero;
	z = 1;

	killed = false;
	invincible = 10;

	scoreDisplay = new TextRenderer();
	constructor() {
		super();
	}

	start() {
		this.graphics.beginFill(0x52a0d1);
		this.graphics.lineStyle({ color: 0xffffff, width: 1, alignment: 0 });
		this.graphics.drawRect(0, 0, this.collider.width, this.collider.height);
		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));
		this.graphics.endFill();

		this.graphics._z = 0;
		
		app.stage.addChild(this.graphics);

		
		this.scoreDisplay = new PIXI.Text(
			"0",
			{
				fontFamily: 'Arial', 
				fontSize: 20, 
				fill: 0xFFFFFF, 
				align: 'left'
			}
		);
		this.scoreDisplay.position.set(20, 20);
		app.stage.addChild(this.scoreDisplay);
	}

	onDestroy() {
		this.graphics.destroy();
		this.scoreDisplay.destroy();
	}

	addForce(v) {
		this.accel.x += v.x;
		this.accel.y += v.y;
	}

	kill(ignore = false) {
		if(!ignore && this.invincible > 0) return;
		if(this.killed) return;

		World.shake(1, 5);
		glitch.center[0] = this.position.x + 10;
		glitch.center[1] = this.position.y + 10;
		
		this.killed = true;
		// screen shake, particles, etc.
		let r = new Results();
		r.player = this;
		Instantiate(r);
	}


	move() {
		this.velocity.x += this.accel.x;
		this.velocity.y += this.accel.y;

		this.position.x += this.velocity.x * World.timeScale;
		this.position.y += this.velocity.y * World.timeScale;
	}

	checkBounds(b) {
		if(this.position.y + this.collider.height > World.canvas.height + this.collider.height - b) {
			return true;
		}
		if(this.position.y < -this.collider.height + b) {
			return true;
		}

		if(this.position.x + this.collider.width > World.canvas.width + this.collider.width - b) {
			return true;
		}
		if(this.position.x < -this.collider.width + b) {
			return true;
		}

		return false;
	}

	
	collideWithCoins() {
		let coins = World.objects.filter(o => (o instanceof Point) && 
			this.collider.collidesWith(this.collider.toC(this.position), o.collider.toC(o.position))
		);

		coins.forEach(o => {
			// Do some special effects
			this.points++;
			this.scoreDisplay.text = this.points;
			this.scoreDisplay.updateText();
			
			do {
				o.setPosition(Utility.randomRangeInt(0, 350), Utility.randomRangeInt(0, 350));
			} while(this.collider.collidesWith(this.collider.toC(this.position), o.collider.toC(o.position)))
		})
	}
	
	collideWithObstacles() {
		let obstacles = World.objects.filter(o => (o instanceof Obstacle) && 
			this.collider.collidesWith(this.collider.toC(this.position), o.collider.toC(o.position))
		);

		if(obstacles.length > 0) this.kill();
	}

	collideWithPlatforms() {
		let platforms = World.objects.filter(o => (o instanceof Platform) && 
			this.collider.collidesWith(this.collider.toC(this.position), o.collider.toC(o.position))
		);

		platforms.forEach(o => {
			let v = new Vector(
				this.center.x - o.center.x,
				this.center.y - o.center.y
			);

			if(Math.abs(v.y / o.collider.height) > Math.abs(v.x / o.collider.width)) {
				if(v.y > 0) {
					// down
					this.velocity.y = 0.2;
					this.position.y = o.position.y + o.collider.height;
					this.position.y += 0.16;
				} else {
					// up
					this.velocity.y += -this.velocity.y - this.accel.y;
					this.position.y = o.position.y - this.collider.height;
				}
			} else {
				if(v.x > 0) {
					// right
					this.velocity.x = 0;
					this.position.x = o.position.x + o.collider.width;
				} else {
					// left
					this.velocity.x = 0;
					this.position.x = o.position.x - this.collider.width;
				}
			}

			v = Vector.zero;
			v.x = Math.cos(o.direction) * o.speed;
			v.y = Math.sin(o.direction) * o.speed;
			this.position.x += v.x;
			this.position.y += v.y;
		});
	}

	get center() {
		return { 
			x: this.position.x + this.collider.width/2, 
			y: this.position.y + this.collider.height/2
		}
	}
	
	
	update() {
		this.invincible -= 1;
		if(this.invincible < 0) {
			this.invincible = 0;
		}

		let horizontal = (Input.keys.has('ArrowRight') ? 1 : 0) + (Input.keys.has('ArrowLeft') ? -1 : 0);
		horizontal *= this.killed ? 0 : this.speed;
		
		this.addForce(new Vector(horizontal, this.killed ? 0 : this.gravity));
		if(!this.killed && Input.pressed.has('ArrowUp')) {
			let forceY = Math.sqrt(Math.abs(this.jumpHeight * this.gravity * -2)) * -1;
			this.addForce(new Vector(0, (-this.velocity.y-this.accel.y) + forceY));
		}
		
		this.move();

		this.collideWithCoins();
		this.collideWithObstacles();
		this.collideWithPlatforms();
		if(this.checkBounds(-5)) this.kill(true);
		this.accel = Vector.zero;

		
		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));

		this.velocity.x *= this.friction.x;
		this.velocity.y *= this.friction.y;
	}
}


class Obstacle extends GameObject {
	speed      = 1;
	direction  = 0;
	collider   = new Circle(12.5);

	a = { x: 0, y: 0 };
	b = { x: 0, y: 0 };
	t = 0;
	
	constructor() {
		super();
	}

	start() {
		this.graphics.beginFill(0xf02222);
		this.graphics.position.set(0, 0);
		this.graphics.lineStyle({ color: 0xffffff, width: 1, alignment: 0 })
		this.graphics.drawCircle(0, 0, this.collider.radius);
		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));
		this.graphics.endFill();

		this.graphics._z = 0;

		app.stage.addChild(this.graphics);
		
		this.a.x = this.position.x;
		this.a.y = this.position.y;
	}

	move() {
		this.t += (this.speed / 100) * World.timeScale;
		this.position.x = this.a.x + (this.b.x - this.a.x) * this.t;
		this.position.y = this.a.y + (this.b.y - this.a.y) * this.t;

		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));
		
		if(this.t > 1 || this.t < 0) {
			this.speed *= -1;
		}
	}

	setPointB(x, y) {
		this.b.x = x;
		this.b.y = y;
	}
	
	update() {
		this.move();

		// [TODO] WEBGL this
		// World.ctx.beginPath();
		// World.ctx.lineWidth = 5;
		// World.ctx.lineCap = "round";
		// World.ctx.strokeStyle = "#82787b";
		// World.ctx.moveTo(this.a.x, this.a.y);
		// World.ctx.lineTo(this.b.x, this.b.y);
		// World.ctx.stroke(); 
	}
}

class Platform extends GameObject {
	speed      = 1;
	direction  = 0;
	z          = -1;

	collider = new Rectangle(100, 50);
	
	constructor() {
		super();
	}

	start() {
		this.graphics.beginFill(0x30c749);
		this.graphics.lineStyle({ color: 0xffffff, width: 1, alignment: 0 });
		this.graphics.drawRect(0, 0, this.collider.width, this.collider.height);
		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));
		this.graphics.endFill();

		this.graphics._z = 0;

		app.stage.addChild(this.graphics);
	}

	move() {
		this.position.x += Math.cos(this.direction) * this.speed * World.timeScale;
		this.position.y += Math.sin(this.direction) * this.speed * World.timeScale;

		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));
	}

	get center() {
		return { 
			x: this.position.x + this.collider.width/2, 
			y: this.position.y + this.collider.height/2
		}
	}

	checkBounds(b) {
		if(this.position.y + this.collider.height > World.canvas.height + this.collider.height + b) {
			this.position.y = -this.collider.height - b;
		}
		if(this.position.y < -this.collider.height - b) {
			this.position.y = World.canvas.height + b;
		}

		if(this.position.x + this.collider.width > World.canvas.width + this.collider.width + b) {
			this.position.x = -this.collider.width - b;
		}
		if(this.position.x < -this.collider.width - b) {
			this.position.x = World.canvas.width + b;
		}
	}
	
	update() {
		this.move();
		this.checkBounds(0);
	}
}

class Point extends GameObject {
	collider = new Circle(8);
	
	constructor() {
		super();
	}

	start() {
		this.graphics.beginFill(0xf5f763);
		this.graphics.lineStyle({ color: 0xffffff, width: 1, alignment: 0 });
		this.graphics.drawCircle(0, 0, this.collider.radius);
		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));
		this.graphics.endFill();

		this.graphics._z = 0;

		app.stage.addChild(this.graphics);
	}

	setPosition(x, y) {
		this.position.x = x;
		this.position.y = y;
		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));
	}
}

class TextRenderer extends GameObject {
	text  = '';
	color = 0xFFFFFF;

	size = 24;
	fontFamily = 'Arial';

	z = 10;
	constructor() {
		super();
	}

	start() {
		this.graphics = new PIXI.Text(
			this.text,
			{
				fontFamily: this.fontFamily, 
				fontSize: this.size, 
				fill: this.color, 
				align: 'left'
			}
		);
		this.graphics.position.set(this.position.x, this.position.y);

		this.graphics._z = 0;

		app.stage.addChild(this.graphics);
	}
}


function easeOut(k) {
	return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
}

class PointRenderer extends GameObject {
	amt    = 0;
	points = 0;
	color  = 0xFFFFFF;

	size = 24;
	fontFamily = 'Arial';

	callback = () => {};
	done = false;

	z = 10;
	constructor() {
		super();
	}

	start() {
		this.graphics = new PIXI.Text(
			"0",
			{
				fontFamily: this.fontFamily, 
				fontSize: this.size, 
				fill: this.color, 
				align: 'left'
			}
		);
		this.graphics.position.set(this.position.x + (World.offset.x * World.magnitude), this.position.y + (World.offset.y * World.magnitude));

		this.graphics._z = 0;

		app.stage.addChild(this.graphics);
	}

	update() {		
		this.amt += 0.01;
		this.graphics.text = `${Math.round(0 + (this.points - 0) * easeOut(this.amt))}`;
		this.graphics.updateText();
		
		if(this.amt >= 1) {
			this.amt = 1;

			if(!this.done) {
				this.callback();
				this.done = true;
			}
		}
	}
}


class ButtonListener extends GameObject {
	pressed = false;
	constructor(key, callback) {
		super();
		
		this.key = key ?? "Space";
		this.callback = callback ?? (() => {});
	}

	update() {
		if(Input.pressed.has(this.key)) this.pressed = true;

		if(!this.pressed) return;
		if(Input.released.has(this.key)) {
			this.callback();
			this.pressed = false;
		}
	}
}

class Results extends GameObject {
	persistent = true;
	startTime = 0;
	time = 0;
	life = 30;
	delay = 50;
	player;
	constructor() {
		super();
	}

	start() {
		this.startTime = World.time;

		chromaticAbberation.enabled = true;
		glitch.enabled = true;
		glitch.time = 0;
	}

	lerp(a, b, t) {
		return a + (b - a) * t;
	}

	easeOutSine(k) {
  		return Math.sin((k * Math.PI) / 2);
	}
	
	update() {
		this.time = World.time - this.startTime;
		let t = this.time/(this.life);

		glitch.time = t/1.5;
		
		World.timeScale = this.lerp(1, 0, this.easeOutSine(t));
		
		if(this.time >= this.life) {
			World.timeScale = 0;

			if(this.time >= this.life + this.delay) {
				World.loadScene('Results');
				
				let p = World.objects.find(o => o instanceof PointRenderer);
				if(p != null) p.points = this.player.points;

				World.timeScale = 1;
				this.destroy();
			}
		}
	}
}