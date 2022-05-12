World.scenes['Title'] = new Scene(() => {
	glitch.enabled = false;
	chromaticAbberation.enabled = false;
	bg.alpha = 0.5;
	
	let Text = new TextRenderer();
	Text.setPosition(80, 100);
	Text.fontFamily = `Arial`
	Text.size = 30;
	Text.text = 'Flyer Game'
	Instantiate(Text);

	Text = new TextRenderer();
	Text.setPosition(80, 130);
	Text.fontFamily = `Arial`
	Text.size = 17;
	Text.text = 'Press [Space]';
	Instantiate(Text);

	Instantiate(new ButtonListener('Space', () => {
		World.loadScene('Game');
	}));
});

World.scenes['Game'] = new Scene(() => {
	bg.alpha = 1;
	// Setup the map
	Instantiate(new Player().setPosition(175-10, 240));

	// Platforms
	{
		let o = new Platform();
		o.setPosition(130, 260);
		o.direction = -Math.PI/2;
		o.speed = 0.2;
		o.collider.width = 70;
		o.collider.height = 45;
		Instantiate(o);


		o = new Platform();
		o.setPosition(60, 320);
		o.direction = -Math.PI;
		o.speed = 0.4;
		o.collider.width = 57;
		o.collider.height = 30;
		Instantiate(o);
	}

	// Obstacles
	{
		let o = new Obstacle();
		o.setPosition(75, 75);
		o.setPointB(140, 70);
		o.speed = 1;
		Instantiate(o);

	 	o = new Obstacle();
		o.setPosition(290, 110);
		o.setPointB(140, 120);
		o.speed = 0.3;
		Instantiate(o);

		o = new Obstacle();
		o.setPosition(240, 310);
		o.setPointB(240, 200);
		o.speed = 4;
		Instantiate(o);
	}

	// Goals
	{
		let o = new Point();
		o.setPosition(175, 60);
		Instantiate(o);
	}
});

World.scenes['Results'] = new Scene(() => {
	glitch.enabled = false;
	chromaticAbberation.enabled = false;
	bg.alpha = 0.5;
	
	let Text = new TextRenderer();
	Text.setPosition(80, 100);
	Text.fontFamily = `Arial`
	Text.size = 30;
	Text.text = 'Game Over'
	Instantiate(Text);

	Text = new TextRenderer();
	Text.setPosition(80, 130);
	Text.fontFamily = `Arial`
	Text.size = 20;
	Text.text = 'Results'
	Instantiate(Text);

	Text = new TextRenderer();
	Text.setPosition(90, 190);
	Text.fontFamily = `Arial`
	Text.size = 17;
	Text.text = 'Points ........ '
	Instantiate(Text);

	Text = new PointRenderer();
	Text.points = 0;
	Text.setPosition(187, 190);
	Text.fontFamily = `Arial`
	Text.size = 17;
	Text.callback = () => {
		let Text = new TextRenderer();
		Text.setPosition(120, 310);
		Text.fontFamily = `Arial`
		Text.size = 16;
		Text.text = 'Press [Space] to Play Again.'
		Instantiate(Text);

		Instantiate(new ButtonListener('Space', () => {
			World.loadScene('Game');
		}));
	}
	Instantiate(Text);
});


const loader = new PIXI.Loader();
let bg;
loader.
	add('background', 'images/bg.bng')
	.load((loader, resources) => {
		const sprite = PIXI.Sprite.from("images/bg.png");
    	app.stage.addChild(sprite);
		bg = sprite;

		
		World.loadScene('Title');
 
		World.magnitude = 0;
		World.offset.x = 0;
		World.offset.y = 0;
	});


app.ticker.add((delta) => {
	elapsed += delta;
	World.time = elapsed;
	
	World.offset.x = Math.cos(World.time);
	World.offset.y = Math.cos(World.time);
	World.magnitude *= 0.9;

	bg?.position.set(World.offset.x * World.magnitude, World.offset.y * World.magnitude);
	World.objects.forEach(obj => obj.update());
	World.objects.forEach(obj => obj.draw());
	
	for(let i = World.objects.length-1; i >= 0; i--) {
		let obj = World.objects[i];
		
		if(obj.toDestroy)
			World.objects.splice(i, 1);
	}

	Input.pressed.clear();
	Input.released.clear();
});