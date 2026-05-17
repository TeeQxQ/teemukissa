const canvas = document.getElementById('game-layer');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const backgroundCanvas = document.getElementById('background-layer');
const backgroundCtx = backgroundCanvas.getContext('2d');
backgroundCanvas.width = window.innerWidth;
backgroundCanvas.height = window.innerHeight;

const DEBUG = false;

class World
{
    constructor(width, height, tileSize, defaultScale)
    {
        this.dimensions = {width: width, height: height};
        this.tileSize = tileSize;
        this.origin = {x: Math.round(canvas.width / 2) - Math.round(width / 2) * tileSize * defaultScale, 
                       y: Math.round(canvas.height / 2) - Math.round(height / 2) * tileSize * defaultScale};
        this.canvasArtist = new CanvasArtist(backgroundCtx, ctx);
        this.mapGenerator = new MapGenerator();
        this.init();
    }

    init()
    {
        this.creatures = [];
        this.tiles = this.mapGenerator.generate(this.dimensions.width,
                                                this.dimensions.height,
                                                this.tileSize
                                                );
        this.flowers = [];
        this.mapUpdateNeeded = true;
        //Sentinel returned by tileAt() for any coordinate outside the map.
        //Only carries the fields sight and water-drain logic actually read.
        this.offMapTile = { biome: biome.WATER, color: 'blue' };
    }

    //Tile at world coordinates (worldX, worldY). Returns the off-map water
    //sentinel when the coordinate falls outside the map.
    tileAt(worldX, worldY)
    {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        if (tileX < 0 || tileX >= this.dimensions.width ||
            tileY < 0 || tileY >= this.dimensions.height)
        {
            return this.offMapTile;
        }
        return this.tiles[tileY * this.dimensions.width + tileX];
    }

    //Map is drawn on the background canvas, and it is updated infrequently to optimize performance
    updateMap(scale)
    {
        const width = backgroundCanvas.width;
        const height = backgroundCanvas.height;
        this.canvasArtist.drawClearBackground(width, height);
        this.tiles.forEach((tile, index) => 
        {
            this.canvasArtist.drawTile(tile, this.origin, scale);
        });
    }

    addCreature()
    {
        //Random position within the map.
        const x = Math.random() * this.dimensions.width * this.tileSize;
        const y = Math.random() * this.dimensions.height * this.tileSize;
        //random direction
        const direction = Math.random() * 2 * Math.PI;
        //15 inputs (3 sights x [isWater, isGrass, isSand, isFlower, isCreature]) -> 8 hidden -> 3 outputs (rotation, shouldRotate gate, speed)
        const brain = Brain.random([15, 8, 3]);
        this.creatures.push(new Creature(x, y, direction, 20, brain));
    }

    addFlower(color)
    {
        const x = Math.random() * this.dimensions.width * this.tileSize;
        const y = Math.random() * this.dimensions.height * this.tileSize;
        this.addFlowerIfPossible(x, y, 10, color);
    }

    //Returns how much energy was moved in split
    addFlowerIfPossible(newX, newY, energy, color)
    {
        let flowerNotInWater = false;

        //find closest tile
        let closestTileIdx = 0;
        let closestDistance = this.dimensions.width;
        this.tiles.forEach((tile, index) => 
        {
            //Center coordinates for the tile
            const tileX = tile.location.x * this.tileSize + this.tileSize/2;
            const tileY = tile.location.y * this.tileSize + this.tileSize/2;

            let dist = Math.sqrt(Math.pow(tileX - newX, 2) + Math.pow(tileY - newY, 2));
            if (dist < closestDistance)
            {
                closestDistance = dist;
                closestTileIdx = index;

                if (closestDistance < this.tileSize / 2 && tile.type == "grass")
                {
                    flowerNotInWater = true;
                }
            }
        });

        const closestTile = this.tiles[closestTileIdx];
        const tileX = closestTile.location.x * this.tileSize + this.tileSize/2;
        const tileY = closestTile.location.y * this.tileSize + this.tileSize/2; 

        if (!flowerNotInWater &&
            tileX - this.tileSize/2 < newX &&
            tileX + this.tileSize/2 > newX &&
            tileY - this.tileSize/2 < newY &&
            tileY + this.tileSize/2 > newY &&
            closestTile.type == "grass")
        {
            flowerNotInWater = true;
        }

        if (flowerNotInWater)
        {
            this.flowers.push(new Flower(newX, newY, energy, closestTileIdx, color));
            this.tiles[closestTileIdx].nofFlowers++;
            return energy;
        }

        return 0;
    }

    moveOrigin(deltaX, deltaY)
    {
        this.origin.x += Math.round(deltaX);
        this.origin.y += Math.round(deltaY);
        this.mapUpdateNeeded = true;
    }

    distance(x1, y1, x2, y2)
    {
        const xDiff = x1 - x2;
        const yDiff = y1 - y2;
        return Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
    }

    draw(scale)
    {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.tiles.forEach((tile, index) => 
        {
            this.mapUpdateNeeded = tile.step() || this.mapUpdateNeeded;
        });

        if (this.mapUpdateNeeded || this.canvasArtist.tilesetDirty || DEBUG_CANVAS_ARTIST)
        {
            this.updateMap(scale);
            this.mapUpdateNeeded = false;
            this.canvasArtist.tilesetDirty = false;
        }

        this.flowers.forEach((flower, index) => 
        {
            //Live...
            if (this.tiles[flower.tileIndex].hasEnergy())
            {
                const flowerGrowth = flower.grow();
                if(flowerGrowth === 0)
                {
                    //Flower has splitted
                    const x = flower.location.x;
                    const y = flower.location.y;
                    //random direction and magnitude to pop
                    const dir = Math.random() * 2 * Math.PI;
                    const magnitude = Math.random() * this.tileSize + this.tileSize;

                    const newX = x + Math.cos(dir) * magnitude;
                    const newY = y + Math.sin(dir) * magnitude;

                    const energyMoved = this.addFlowerIfPossible(newX, newY, flower.splitEnergy, flower.color);
                    if (energyMoved === 0)
                    {
                        //New flower couldnt be created
                        this.tiles[flower.tileIndex].energyRecoveryStorage += flower.splitEnergy;
                    }

                }
                else
                {
                    //Remove as much energy as flower took for growing
                    this.tiles[flower.tileIndex].energy -= flowerGrowth;
                }

                //flower.draw(this.origin, scale);
                this.canvasArtist.drawFlower(flower, this.origin, scale);

            }
            //...or die
            else
            {
                const flowerWithering = flower.wither();
                if(flowerWithering === 0)
                {
                    this.tiles[flower.tileIndex].nofFlowers--;
                    this.tiles[flower.tileIndex].energyRecoveryStorage += flower.minEnergy;
                    this.flowers.splice(index, 1);
                }
                else
                {
                    this.tiles[flower.tileIndex].energyRecoveryStorage += flowerWithering;
                    this.canvasArtist.drawFlower(flower, this.origin, scale);
                }
            }
            
        });

        this.creatures.forEach((creature, creatureIndex) =>
        {
            //Brain reacts to last frame's sight, then we move.
            creature.think();
            creature.step();

            //Water is fatal: drain extra energy when standing on a water tile.
            //Off-map counts as water too.
            const standTile = this.tileAt(creature.location.x, creature.location.y);
            if (standTile.biome === biome.WATER)
            {
                creature.energy -= creature.waterDrain;
            }

            //Update each sight spot (left, center, right).
            for (const s of creature.sights)
            {
                const sightX = creature.location.x + s.vector.x;
                const sightY = creature.location.y + s.vector.y;
                const sightTile = this.tileAt(sightX, sightY);
                s.color = sightTile.color;
                s.biome = sightTile.biome;
                s.hasFlower = false;
                s.hasCreature = false;

                //Other creatures in this sight spot.
                this.creatures.forEach((other, otherIndex) =>
                {
                    if (otherIndex === creatureIndex) return;
                    if (this.distance(sightX, sightY,
                                      other.location.x, other.location.y) < creature.sightRange + other.radius)
                    {
                        s.hasCreature = true;
                        s.color = 'cyan';
                    }
                });

                //Flowers in this sight spot.
                this.flowers.forEach((flower) =>
                {
                    if (this.distance(sightX, sightY,
                                      flower.location.x, flower.location.y) < creature.sightRange)
                    {
                        s.color = 'rgb(' + flower.color.r + ',' + flower.color.g + ',' + flower.color.b + ')';
                        s.hasFlower = true;
                    }
                });
            }

            //Flower collisions (independent of sight).
            this.flowers.forEach((flower, flowerIndex) =>
            {
                if (this.distance(creature.location.x,
                                  creature.location.y,
                                  flower.location.x,
                                  flower.location.y) < creature.radius + flower.size)
                {
                    if(creature.eat(flower.energy))
                    {
                        this.flowers.splice(flowerIndex, 1);
                    }
                }
            });

            //Reproduce if energy threshold reached. Children get pushed to the
            //end of the array, so they aren't visited again this frame.
            if (creature.shouldReproduce())
            {
                this.creatures.push(creature.reproduce());
            }

            if (creature.isAlive())
            {
                this.canvasArtist.drawCreature(creature, this.origin, scale);
            }
            else
            {
                this.creatures.splice(creatureIndex, 1);
            }
            
        });

        
    }
}

class Simulator
{
    constructor()
    {
        //Scaling
        this.minScale = 0.4;
        this.maxScale = 3;
        this.scale = this.minScale;
        this.tileSize = 50;

        //Mouse handling
        this.mouseClicked = false;
        this.mouseClickCoord = {x: 0, y: 0};

        const worldWidth = 30;
        const worldHeight = 30;
        
        this.world = new World(worldWidth, worldHeight, this.tileSize, this.scale);

        this.init();
    }

    init()
    {
        const nofCreatures = 40;
        const nofFlowers = 40;
        const flowerColor = {r: 255, g: 0, b: 0};
        for (let i = 0; i < nofCreatures; i++)
        {
            this.world.addCreature();
        }

        for (let i = 0; i < nofFlowers; i++)
        {
            this.world.addFlower(flowerColor);
        }
    }

    step()
    {
        this.world.draw(this.scale);
    }

    animate()
    {
        this.step();
        requestAnimationFrame(() => this.animate());
    }

    run()
    {
        this.animate();
    }

    pause()
    {
        //TODO
    }

    stop()
    {
        //TODO
    }

    wheelController(event)
    {
        
        const mouseXCoord = (event.x - this.world.origin.x) / (this.tileSize * this.scale);
        const mouseYCoord = (event.y - this.world.origin.y) / (this.tileSize * this.scale);

        if (event.deltaY > 0)
        {
            if (this.scale > this.minScale)
            {
                this.scale -= 0.1;
            }
        }
        else
        {
            if (this.scale < this.maxScale)
            {
                this.scale += 0.1;
            }
        }

        const newMouseXCoord = (event.x - this.world.origin.x) / (this.tileSize * this.scale);
        const newMouseYCoord = (event.y - this.world.origin.y) / (this.tileSize * this.scale);

        this.world.moveOrigin((newMouseXCoord - mouseXCoord) * this.tileSize * this.scale, 
                              (newMouseYCoord - mouseYCoord) * this.tileSize * this.scale);
    }

    clickController(event)
    {
        this.mouseClicked = true;
        this.mouseClickCoord = {x: event.x, y: event.y};
        this.world.creatures[0].rotate(Math.PI/2);
    }

    releaseController(event)
    {
        this.mouseClicked = false;
    }

    moveController(event)
    {
        if (this.mouseClicked)
        {
            this.world.moveOrigin(event.x - this.mouseClickCoord.x, 
                                  event.y - this.mouseClickCoord.y);
            this.mouseClickCoord = {x: event.x, y: event.y};
        }
    }
}

const simulator = new Simulator();

canvas.onwheel = (event) =>
{
    simulator.wheelController(event);
}

canvas.onmousedown = (event) =>
{
    simulator.clickController(event);
};

canvas.onmouseup = (event) => 
{
    simulator.releaseController(event);
}

canvas.onmousemove = (event) => 
{
    simulator.moveController(event);
}

simulator.run();

