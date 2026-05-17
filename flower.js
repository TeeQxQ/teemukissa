//
class Flower
{
    //x and y refers to an absolute location
    constructor(x, y, energy, tileIdx, color)
    {
        this.location = {x: x, y: y};

        //Energy levels
        this.energy = energy;
        this.maxEnergy = 14;
        this.minEnergy = 10;
        this.splitEnergy = 10;
        this.energyGrowRate = 0.015;

        //Physical size
        this.startSize = 1;
        this.size = this.startSize;
        this.grownSize = 10;
        this.grownRate = (this.grownSize - this.size) / Math.round((this.maxEnergy - this.energy) / this.energyGrowRate);
        this.witherRate = this.grownRate * 2;
        
        this.tileIndex = tileIdx;

        //color = {r: value, g: value, b: value}
        this.color = color;
    }

    grow()
    {
        //Physical appearance
        if (this.size < this.grownSize)
        {
            this.size += this.grownRate;
        }

        //Grow larger
        if (this.energy < this.maxEnergy)
        {
            this.energy += this.energyGrowRate;
            return this.energyGrowRate;
        }
        //Split
        else
        {
            this.energy -= this.splitEnergy;
            return 0;
        }
    }

    wither()
    {
        //Grey
        this.color = {r: 150, g: 150, b: 150};

        //Physical appearance
        if (this.size > this.startSize)
        {
            this.size -= this.witherRate;
        }

        //Wither until dead
        if (this.energy > this.minEnergy)
        {
            this.energy -= this.energyGrowRate;
            return this.energyGrowRate;
        }
        else
        {
            return 0;
        }
    }

}
