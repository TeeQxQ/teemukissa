//Probability that any single parameter (per creature trait, per brain weight)
//is perturbed during reproduction.
const MUTATION_RATE = 0.01;

//With probability MUTATION_RATE, add uniform jitter in [-sigma, +sigma] and
//clamp to [min, max]; otherwise return value unchanged.
function maybeMutate(value, sigma, min, max)
{
    if (Math.random() < MUTATION_RATE)
    {
        const jitter = (Math.random() - 0.5) * 2 * sigma;
        return Math.max(min, Math.min(max, value + jitter));
    }
    return value;
}

//Represents a single creature wondering in the world
class Creature
{
    //x and y refers to an absolute location
    constructor(x, y, direction, radius, brain)
    {
        //Physics
        this.location = {x: x, y: y};
        this.velocity = {x: 0, y: 0};
        //Speed bounds the brain's speed output is mapped into.
        this.minSpeed = 0.25;
        this.maxSpeed = 0.75;
        this.velocityMagnitude = (this.minSpeed + this.maxSpeed) / 2;
        this.radius = radius;
        this.direction = direction; //0 - 2*PI

        //Energy
        this.maxEnergy = 100;
        this.minEnergy = 0;
        this.energy = this.maxEnergy / 2;
        //Per-step drain is proportional to current speed:
        //energy -= velocityMagnitude * energyConsumptionPerSpeed.
        this.energyConsumptionPerSpeed = 0.02;
        //Extra energy drained per step while standing on a water tile.
        this.waterDrain = 0.5;
        //Energy threshold at which the creature reproduces; on reproduction
        //the parent loses half its energy and the child starts with the
        //parent's remaining (post-split) energy. Randomized for initial
        //creatures; children inherit the parent's value (see reproduce()).
        //Range 50-95.
        this.reproductionEnergy = Math.random() * 45 + 50;

        //Vision. Three sight spots: left, center, right. All at the same distance,
        //offset by sightAngles (radians) relative to facing direction.
        this.sightMagnitude = this.radius * 3;
        //Range 10-30
        this.sightRange = Math.random() * 20 + 10;
        this.sightAngles = [-Math.PI / 6, 0, Math.PI / 6];
        this.sights = this.sightAngles.map(() => ({
            vector: {x: 0, y: 0},
            color: '',
            biome: null,
            hasFlower: false,
            hasCreature: false
        }));

        //Brain. Inputs are 3 sights x 5 binary flags = 15 inputs total. Each sight
        //contributes [isWater, isGrass, isSand, isFlower, isCreature] in left,
        //center, right order. Three outputs: output[0] in [-1, 1] is scaled by
        //maxTurn for the rotation; output[1] is a gate -- rotation is applied
        //only when output[1] > 0; output[2] in [-1, 1] is mapped linearly into
        //[minSpeed, maxSpeed] for velocityMagnitude.
        this.brain = brain;
        this.maxTurn = 0.2;

        this.updateVelocity();
        this.updateSight();
    }

    //Flatten all sights into one input vector. Per sight (left, center, right):
    //[isWater, isGrass, isSand, isFlower, isCreature].
    sightAsBinary()
    {
        const inputs = [];
        for (const s of this.sights)
        {
            inputs.push(s.biome === biome.WATER ? 1 : 0);
            inputs.push(s.biome === biome.GRASS ? 1 : 0);
            inputs.push(s.biome === biome.SAND  ? 1 : 0);
            inputs.push(s.hasFlower             ? 1 : 0);
            inputs.push(s.hasCreature           ? 1 : 0);
        }
        return inputs;
    }

    think()
    {
        if (!this.brain) return;
        const output = this.brain.think(this.sightAsBinary());
        const shouldRotate = output[1] > 0;
        if (shouldRotate)
        {
            this.rotate(output[0] * this.maxTurn);
        }
        //Map output[2] from [-1, 1] to [minSpeed, maxSpeed].
        const speedRange = this.maxSpeed - this.minSpeed;
        this.velocityMagnitude = this.minSpeed + (output[2] + 1) * 0.5 * speedRange;
        this.updateVelocity();
    }

    updateVelocity()
    {
        this.velocity = {
            x: Math.cos(this.direction) * this.velocityMagnitude,
            y: Math.sin(this.direction) * this.velocityMagnitude
        }
    }

    updateSight()
    {
        for (let i = 0; i < this.sights.length; i++)
        {
            const angle = this.direction + this.sightAngles[i];
            this.sights[i].vector = {
                x: Math.cos(angle) * this.sightMagnitude,
                y: Math.sin(angle) * this.sightMagnitude
            };
        }
    }

    rotate(radians)
    {
        this.direction += radians;
        if (this.direction > 2 * Math.PI)
        {
            this.direction -= 2 * Math.PI;
        }

        if (this.direction < 0)
        {
            this.direction += 2 * Math.PI;
        }

        this.updateVelocity();
        this.updateSight();
    }

    eat(energy)
    {
        if (this.maxEnergy - this.energy > energy)
        {
            this.energy += energy;
            return true;
        }

        return false;
    }

    isAlive()
    {
        return this.energy > this.minEnergy;
    }

    shouldReproduce()
    {
        return this.energy >= this.reproductionEnergy;
    }

    //Halve parent energy and return a child with a (possibly mutated) clone of
    //the brain and inheritable parameters. Child spawns at the parent's
    //location with a random facing and starts with the parent's post-split
    //energy. Each weight and each inheritable trait independently mutates with
    //probability MUTATION_RATE.
    reproduce()
    {
        this.energy /= 2;

        const childBrain = this.brain.clone();
        childBrain.mutate(MUTATION_RATE);

        //Child heads off in a random direction, independent of the parent.
        const childDirection = Math.random() * 2 * Math.PI;
        const child = new Creature(
            this.location.x,
            this.location.y,
            childDirection,
            this.radius,
            childBrain
        );
        child.sightRange         = maybeMutate(this.sightRange,         2,    5,   50);
        child.minSpeed           = maybeMutate(this.minSpeed,           0.05, 0.05, 1.0);
        child.maxSpeed           = maybeMutate(this.maxSpeed,           0.05, 0.3,  2.0);
        child.reproductionEnergy = maybeMutate(this.reproductionEnergy, 5,    30,   99);
        //If mutation crossed the speeds, swap so min <= max.
        if (child.minSpeed > child.maxSpeed)
        {
            [child.minSpeed, child.maxSpeed] = [child.maxSpeed, child.minSpeed];
        }
        child.velocityMagnitude = this.velocityMagnitude;
        child.energy = this.energy;
        return child;
    }

    step()
    {
        this.energy -= this.velocityMagnitude * this.energyConsumptionPerSpeed;
        this.location.x += this.velocity.x;
        this.location.y += this.velocity.y;
    }
}