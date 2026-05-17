class MapGenerator
{
    constructor()
    {
        //
    }

    generate(width, height, tileSize)
    {
        let tiles = new Array();

        let waterArray = new Array(width * height);

        //Initialize all tiles to grass
        for (let i = 0; i < width * height; i++)
        {
            const xCoord = i % width;
            const yCoord = Math.floor(i / height);
            tiles.push(new Tile(xCoord, yCoord, tileSize, "green", "grass"));
            waterArray[i] = 0;
        }

        const waterHits = 1000;
        for(let i = 0; i < waterHits; i++)
        {
            const r = Math.floor(Math.random() * width * height);

            //[1, 2, 3]
            //[4, r, 5]
            //[6, 7, 8]

            const r1 = r - width -1;
            const r2 = r - width;
            const r3 = r - width +1;
            const r4 = r -1;
            const r5 = r +1;
            const r6 = r + width -1;
            const r7 = r + width;
            const r8 = r + width +1;

            waterArray[r] += 6;

            if (r % width != 0 && r % height != 0)
            {
                waterArray[r1] += 4;
            }

            if (r >= width)
            {
                waterArray[r2] += 4;
            }

            if (r % width != width -1 && r >= width)
            {
                waterArray[r3] += 4;
            }

            if (r % width != 0)
            {
                waterArray[r4] += 4;
            }

            if (r % width != width -1)
            {
                waterArray[r5] += 4;
            }

            if (r % width != 0 && r < width * (height-1))
            {
                waterArray[r6] += 4;
            }

            if (r < width * (height-1))
            {
                waterArray[r7] += 4;
            }

            if (r % width != width -1 && r % height != height -1)
            {
                waterArray[r8] += 4;
            }
        }

        for (let i = 0; i < width * height; i++)
        {
            if (waterArray[i] > 50)
            {
                tiles[i].type = "water";
                tiles[i].biome = biome.WATER;
                tiles[i].color = "blue";
            }
        }
        return tiles;
    }
}