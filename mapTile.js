const biome =
{
    WATER: "water",
    GRASS: "grass",
    SAND: "sand"
}

//World is created from square blocks called tiles
class Tile
{
    constructor(indX, indY, size, color, type)
    {
        //Location refers to an index in the 2d array
        this.location = {x: indX, y: indY};
        this.size = size;
        this.color = color;
        this.type = type;
        this.biome = biome.GRASS;
        this.maxEnergy = 100;
        this.minEnergy = 0;
        this.energy = 60;
        this.energyGrowRate = 0.02;
        this.nofFlowers = 0;
        //Storage to store energy which will be returned after all flowers have died
        this.energyRecoveryStorage = 0;
        this.energyRecoveryRate = 0.02;
    }

    hasEnergy()
    {
        return this.energy > this.minEnergy;
    }

    //Returns true if something needs to be redrawn on the screen
    step()
    {
        if(this.nofFlowers === 0 && this.type != "water")
        {
            if (this.energyRecoveryStorage > 0)
            {
                this.energy += this.energyRecoveryRate;
                this.energyRecoveryStorage -= this.energyRecoveryRate;
            }
            else
            {
                if (this.energy > 0 && this.type != "grass")
                {
                    this.type = "grass";
                    this.biome = biome.GRASS;
                    this.color = "green";
                    return true;
                }
            }
        }
        else
        {
            if (this.energy <= this.minEnergy && this.type != "sand")
            {
                this.type = "sand";
                this.biome = biome.SAND;
                this.color = "orange";
                return true;
            }
        }

        return false;
    }
}