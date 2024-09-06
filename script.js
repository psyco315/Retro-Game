class Player{
    constructor(game){
        this.game = game
        this.width = 100
        this.height = 100
        this.x = (this.game.width - this.width) * .5
        this.y = this.game.height - this.height
        this.playerLives = 3
        this.speed = 5
        this.image = document.getElementById("player")
    }

    draw(context){
        context.drawImage(this.image, this.x, this.y, this.width, this.height)
    }

    update(){
        if(this.game.keys.indexOf("a") > -1 && this.game.keys.indexOf("a") > this.game.keys.indexOf("d")) this.x -= this.speed
        if(this.game.keys.indexOf("d") > -1 && this.game.keys.indexOf("d") > this.game.keys.indexOf("a")) this.x += this.speed

        // Horizontal Limit
        if(this.x < 0-this.width*.5) this.x = -this.width*.5
        else if (this.x > this.game.width - this.width*.5) this.x = this.game.width - this.width*.5
    }

    shoot(){
        const projectile = this.game.getProjectile()
        if(projectile) projectile.start(this.x + this.width*.5 - projectile.width*.5, this.y)
    }

    restart(){
        this.x = (this.game.width - this.width) * .5
        this.y = this.game.height - this.height
        this.playerLives = 3
    }
}




class Projectile{
    constructor(){
        this.width = 5
        this.height = 20
        this.x = 0
        this.y = 0
        this.speed = 20
        this.free = true // This tells us wether the projectile is ready to be used from the pool
    }

    draw(context){
        if(!this.free){
            context.fillRect(this.x, this.y, this.width, this.height)
        }
    }

    update(){
        if(!this.free){
            this.y -= this.speed
            if(this.y < 0-this.height) this.reset()
        }
    }

    start(x ,y){
        this.x = x
        this.y = y
        this.free = false
    }

    reset(){
        this.free = true
    }
}




class Enemy{
    constructor(game, positionX, positionY){
        this.game = game
        this.width = this.game.enemySize
        this.height = this.game.enemySize
        this.x = 0
        this.y = 0
        this.positionX = positionX
        this.positionY = positionY
        this.markedForDeletion = false
    }

    draw(context){
        context.drawImage(this.image, this.x, this.y, this.width, this.height)
    }

    update(x, y){
        this.x = x + this.positionX
        this.y = y + this.positionY

        // Check collision of projectile with enemy
        this.game.projectilePool.forEach(projectile => {
            if(!projectile.free && this.game.checkCollision(projectile, this)){
                this.hit(1)
                projectile.free = true
            }
        })

        if(this.lives < 1){
            this.markedForDeletion = true
            if(!this.game.gameOver) this.game.score += this.maxLives
        }

        // Check collision of enemy with lower boundary
        if(this.y + this.height > this.game.height){
            this.markedForDeletion = true
            this.game.gameOver = true
        }

        // Check collision of enemy with player
        if(this.game.checkCollision(this, this.game.player)){
            this.markedForDeletion = true
            if(!this.game.gameOver) this.game.score--
            this.game.player.playerLives--
            if(this.game.player.playerLives < 1) this.game.gameOver = true
        }
    }

    hit(damage){
        this.lives -= damage
    }
}



class Enemy1 extends Enemy{
    constructor(game, positionX, positionY){
        super(game, positionX, positionY)
        this.image = document.getElementById("enemy1")
        this.lives = 1
        this.maxLives = this.lives
    }
}



class Wave{
    constructor(game){
        this.game = game
        this.height = this.game.row * this.game.enemySize
        this.width = this.game.column * this.game.enemySize
        this.x = game.width*.5 - this.width*.5
        this.y = 0 - this.height
        this.speedX = Math.random() < .5 ? 2:-2
        this.enemies = []
        this.create()
        this.nextWaveTrigger = false // Ensures that a wave doesn't trigger a new wave more than once
    }

    render(context){
        if(this.y < 0) this.y += 4 // Makes the grid float in 4px per frame

        // context.strokeRect(this.x, this.y, this.width, this.height) // For visualising the wave

        this.x += this.speedX

        if(this.x <0 || this.x > this.game.width - this.width){
            this.y += this.game.enemySize
            this.speedX *= -1
        }

        this.enemies.forEach(enemy=>{
            enemy.update(this.x, this.y)
            enemy.draw(context)
        })

        this.enemies = this.enemies.filter(Object =>!Object.markedForDeletion)
    }

    create(){
        for(let y=0; y < this.game.row; y++){
            for(let x=0; x < this.game.column; x++){
                let enemyPosX = x*this.game.enemySize
                let enemyPosY = y*this.game.enemySize

                this.enemies.push(new Enemy1(this.game, enemyPosX, enemyPosY))
            }
        }
    }
}




class Game{
    constructor(canvas){
        this.canvas = canvas
        this.width = this.canvas.width
        this.height = this.canvas.height
        this.keys = [];
        this.player = new Player(this)
        this.gameOver = false

        this.projectilePool = []
        this.numProj = 10
        this.createProjectiles()

        this.column = 3
        this.row = 3
        this.enemySize = 60

        this.waves = []
        this.waves.push(new Wave(this))
        this.waveCount = 1

        this.score = 0

        window.addEventListener("keydown", e=>{
            if(this.keys.indexOf(e.key) === -1) this.keys.push(e.key)
            if(e.key === '1') this.player.shoot()
            if(e.key === 'r' && this.gameOver) this.restart()
        })
        window.addEventListener("keyup", e=>{
            const index = this.keys.indexOf(e.key)
            if(index > -1) this.keys.splice(index, 1)
        })
    }

    render(ctx){
        this.player.draw(ctx)
        this.player.update()
        this.projectilePool.forEach(projectile => {
            projectile.update()
            projectile.draw(ctx)
        })
        this.waves.forEach(wave=>{
            wave.render(ctx)
            if(wave.enemies.length < 1 && !wave.nextWaveTrigger && !this.gameOver){
                this.newWave()
                this.waveCount++
                wave.nextWaveTrigger = true
            }
        })
        this.drawStatusText(ctx)
    }

    // Create projectile object pool
    createProjectiles(){
        for(let i=0; i<this.numProj; i++){
            this.projectilePool.push(new Projectile)
        }
    }

    getProjectile(){
        for(let i=0; i<this.projectilePool.length; i++){
            if(this.projectilePool[i].free) return this.projectilePool[i]
        }
    }

    // Colision detection
    checkCollision(a, b){
        return(
            a.x < b.x + b.width &&
            a.x + a.width> b.x &&
            a.y < b.y + b.height &&
            a.y + a.height> b.y
        )
    }

    drawStatusText(context){
        context.save()
        context.fillText("Score: " + this.score, 40, 40) // Last two arguments are the coordinates of text
        context.fillText("Wave: " + this.waveCount, 40, 80)

        for(let i=0; i< this.player.playerLives; i++){
            context.fillRect(40 + 30*i, 100, 20, 20) // x position, y position, width, height
        }

        if(this.gameOver){
            context.textAlign = "center"
            context.font = "100px Impact"
            context.fillText("GAME OVER", this.width*.5, this.height*.5)
            context.font = "35px Impact"
            context.fillText("Press R to Restart", this.width*.5, this.height*.5 + 50)
            this.waves[-1].speedX = 0
        }
        context.restore()
    }

    newWave(){
        if(Math.random() < .5){
            this.column++
        }
        else{
            this.row++
        }
        this.waves.push(new Wave(this))
    }

    restart(){
        this.player.restart()
        this.column = 3
        this.row = 3
        this.enemySize = 60

        this.waves = []
        this.waves.push(new Wave(this))
        this.waveCount = 1

        this.score = 0
        this.gameOver = false
    }
}




window.addEventListener("load", function(e){
    const canvas = document.getElementById("canvas1")
    const ctx = canvas.getContext('2d') // Allows us to draw in the canvas
    canvas.width = window.innerWidth - 50
    canvas.height = window.innerHeight -50
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'white'
    ctx.font = "30px Impact"

    const game = new Game(canvas)

    function animate(){ // This triggers a loop
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        game.render(ctx)
        window.requestAnimationFrame(animate)
    }
    animate()
})