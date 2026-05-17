const DEBUG_CANVAS_ARTIST = false;

class CanvasArtist
{
    constructor(backgroundContext, gameContext)
    {
        this.bgCtx = backgroundContext;
        this.ctx = gameContext;

        this.grassImage = new Image();
        this.grassImage.src = "grass.jpg";
        this.tilesetDirty = true;
        this.grassImage.onload = () => { this.tilesetDirty = true; };
    }

    //https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    shadeColor(color, percent) {

        var R = parseInt(color.substring(1,3),16);
        var G = parseInt(color.substring(3,5),16);
        var B = parseInt(color.substring(5,7),16);
    
        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);
    
        R = (R<255)?R:255;  
        G = (G<255)?G:255;  
        B = (B<255)?B:255; 
    
        var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
    
        return "#"+RR+GG+BB;
    }

    drawClearBackground(width, height)
    {
        this.bgCtx.clearRect(0, 0, width, height);
    }

    drawCreature(creature, origin, scale)
    {
        this.ctx.beginPath();
        this.ctx.fillStyle = 'cyan';
        this.ctx.arc(origin.x + Math.round(creature.location.x * scale),
                     origin.y + Math.round(creature.location.y * scale),
                     creature.radius * scale,
                     0,
                     Math.PI * 2);
        this.ctx.fill();
        this.ctx.closePath();

        if (DEBUG_CANVAS_ARTIST)
        {
            for (const s of creature.sights)
            {
                this.ctx.beginPath();
                this.ctx.fillStyle = s.color;
                this.ctx.arc(
                    origin.x + Math.round((creature.location.x + s.vector.x) * scale),
                    origin.y + Math.round((creature.location.y + s.vector.y) * scale),
                    creature.sightRange * scale,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.closePath();
            }
        }

        this.ctx.stroke();
        this.ctx.font = "10px Arial";
        this.ctx.fillStyle = "black";
        this.ctx.textAlign = "center";
        this.ctx.fillText(creature.energy.toFixed(2), 
                          origin.x + Math.round((creature.location.x) * scale),
                          origin.y + Math.round((creature.location.y) * scale)
                        );

    }

    drawFlower(flower, origin, scale)
    {
        const x = origin.x + flower.location.x * scale;
        const y = origin.y + flower.location.y * scale;
        const color = flower.color;

        this.ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
        //this.ctx.fillStyle = this.shadeColor(this.ctx.fillStyle, -90);
        this.ctx.beginPath();
        this.ctx.arc(x,
                     y,
                     flower.size * scale,
                     0,
                     Math.PI * 2);
        this.ctx.fill();
        this.ctx.closePath();
    }

    //Tiles are drawn on background
    drawTile(tile, origin, scale)
    {
        //Water won't be drawn
        if (tile.biome != biome.WATER)
        {
            const tileX = origin.x + tile.location.x * tile.size * scale;
            const tileY = origin.y + tile.location.y * tile.size * scale;
            const tileW = tile.size * scale;

            if (tile.biome == biome.GRASS
                && this.grassImage.complete
                && this.grassImage.naturalWidth > 0)
            {
                this.bgCtx.drawImage(this.grassImage, tileX, tileY, tileW, tileW);
            }
            else
            {
                let color;
                switch(tile.biome)
                {
                    case biome.GRASS:
                        color = "green";
                        break;
                    case biome.SAND:
                        color = "orange";
                        break;
                    default:
                        break;
                }
                this.bgCtx.fillStyle = color;
                this.bgCtx.beginPath();
                this.bgCtx.rect(tileX, tileY, tileW, tileW);
                this.bgCtx.fill();
            }
            if(DEBUG_CANVAS_ARTIST)
            {
                this.bgCtx.font = "10px Arial";
                this.bgCtx.fillStyle = "white";
                this.bgCtx.textAlign = "center";
                this.bgCtx.fillText(tile.energy.toFixed(2) + ":" + tile.energyRecoveryStorage.toFixed(2),
                                    origin.x + (tile.location.x * tile.size + tile.size/2) * scale,
                                    origin.y + (tile.location.y * tile.size + tile.size/2) * scale
                                    );
            }
        }
    }
}