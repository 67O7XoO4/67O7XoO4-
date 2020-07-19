(function(){

    // Size of canvas. These get updated after browser loading.
    let canvasSize = {w : 150, h: 150};
    let mousePos = {x: 0, y:0, out: true};

    var boids = [];

    function initBoids() {
        boids = [];

        let mean = config.speedLimit / 2;

        for (var i = 0; i < config.numBoids; i += 1) {
            boids[boids.length] = {
                x: Math.random() * canvasSize.w,
                y: Math.random() * canvasSize.h,
                dx: Math.random() * config.speedLimit - mean,
                dy: Math.random() * config.speedLimit - mean,
                history: [],
            };
        }
    }

    function distance(boid1, boid2) {
        //pythagore
        return Math.sqrt(
            (boid1.x - boid2.x) * (boid1.x - boid2.x) +
            (boid1.y - boid2.y) * (boid1.y - boid2.y),
        );
    }

    // Called initially and whenever the window resizes to update the canvas
    // get size: width/height variables.
    function initCanvas() {
        const canvas = document.getElementById("boidsCanvas");
        //map the canvas size to the displayed size
        canvas.width= canvas.clientWidth;
        canvas.height= canvas.clientHeight;
        //save the size
        canvasSize = {w : canvas.clientWidth, h: canvas.clientHeight};
        
        canvas.addEventListener('mouseout', function(evt) {           
            mousePos.out = true;
        }, false);

        canvas.addEventListener('mousemove', function(evt) {
            var rect = canvas.getBoundingClientRect();

            mousePos.out = false;

            mousePos.x = evt.clientX - rect.left;
            mousePos.y = evt.clientY - rect.top;
        }, false);
    }

    // Constrain a boid to within the window. If it gets too close to an edge,
    // nudge it back in and reverse its direction.
    function keepWithinBounds(boid) {
        const turnFactor = 1;

        if (boid.x < config.margin) {
            boid.dx += turnFactor;
        }
        if (boid.x > canvasSize.w - config.margin) {
            boid.dx -= turnFactor
        }
        if (boid.y < config.margin) {
            boid.dy += turnFactor;
        }
        if (boid.y > canvasSize.h - config.margin) {
            boid.dy -= turnFactor;
        }
    }

    // Find the center of mass of the other boids and adjust velocity slightly to
    // point towards the center of mass.
    function flyTowardsCenter(boid) {

        if ( ! config.centeringFactor) return;

        const centeringFactor = config.centeringFactor / 1000; // adjust velocity by this %

        let centerX = 0;
        let centerY = 0;
        let numNeighbors = 0;

        for (let otherBoid of boids) {
            if (distance(boid, otherBoid) < config.visualRange) {
                centerX += otherBoid.x;
                centerY += otherBoid.y;
                numNeighbors += 1;
            }
        }

        if (numNeighbors) {
            centerX = centerX / numNeighbors;
            centerY = centerY / numNeighbors;

            boid.dx += (centerX - boid.x) * centeringFactor;
            boid.dy += (centerY - boid.y) * centeringFactor;
        }
    }

    // Move away from other boids that are too close to avoid colliding
    function avoidOthers(boid) {

        if ( ! config.avoidFactor) return;

        const avoidFactor = config.avoidFactor; 
        let moveX = 0;
        let moveY = 0;
        for (let otherBoid of boids) {
            if (otherBoid !== boid) {
                let dist = distance(boid, otherBoid);
                if (dist < config.minDistance) {
                    //the closest the otherBoid is, the bigger the move will be
                    let distX = boid.x - otherBoid.x;
                    moveX += distX ? (distX / Math.abs(distX)) * avoidFactor / dist : avoidFactor;
                    
                    let distY = boid.y - otherBoid.y;
                    moveY += distY ? (distY / Math.abs(distY)) * avoidFactor / dist : avoidFactor;
                }
            }
        }

        boid.dx += moveX ;
        boid.dy += moveY ;
    }

    // Move away from the mouse
    function avoidMouse(boid) {

        if ( ! config.avoidMouseFactor || mousePos.out) return;

        const avoidFactor = config.avoidMouseFactor; 
        let moveX = 0;
        let moveY = 0;

        let dist = distance(boid, mousePos);
        if (dist < config.mouseMinDistance) {
            let distX = boid.x - mousePos.x;
            moveX += distX ? (distX / Math.abs(distX)) * avoidFactor / dist : avoidFactor;
            let distY = boid.y - mousePos.y;
            moveY += distY ? (distY / Math.abs(distY)) * avoidFactor / dist : avoidFactor;
        }

        boid.dx += moveX ;
        boid.dy += moveY ;
    }

    // Find the average velocity (speed and direction) of the other boids and
    // adjust velocity slightly to match.
    function matchVelocity(boid) {
        if ( ! config.matchVelocityFactor) return;
        const matchingFactor = config.matchVelocityFactor / 100 ; // Adjust by this % of average velocity

        let avgDX = 0;
        let avgDY = 0;
        let numNeighbors = 0;

        for (let otherBoid of boids) {
            if (distance(boid, otherBoid) < config.visualRange) {
                avgDX += otherBoid.dx;
                avgDY += otherBoid.dy;
                numNeighbors += 1;
            }
        }

        if (numNeighbors) {
            avgDX = avgDX / numNeighbors;
            avgDY = avgDY / numNeighbors;

            boid.dx += (avgDX - boid.dx) * matchingFactor;
            boid.dy += (avgDY - boid.dy) * matchingFactor;
        }
    }

    // Speed will naturally vary in flocking behavior, but real animals can't go
    // arbitrarily fast.
    function limitSpeed(boid) {
        if ( ! config.speedLimit) return;

        const speedLimit = config.speedLimit;

        const speed = Math.sqrt(boid.dx * boid.dx + boid.dy * boid.dy);
        if (speed > speedLimit) {
            boid.dx = (boid.dx / speed) * speedLimit;
            boid.dy = (boid.dy / speed) * speedLimit;
        }
    }

    function drawBoid(ctx, boid) {
        const angle = Math.atan2(boid.dy, boid.dx);
        ctx.translate(boid.x, boid.y);
        ctx.rotate(angle);
        ctx.translate(-boid.x, -boid.y);
        ctx.fillStyle = "#558cf4";
        ctx.beginPath();
        ctx.moveTo(boid.x, boid.y);
        ctx.lineTo(boid.x - 15, boid.y + 5);
        ctx.lineTo(boid.x - 15, boid.y - 5);
        ctx.lineTo(boid.x, boid.y);
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        if (config.drawTrail) {
            ctx.strokeStyle = "#558cf4";
            ctx.beginPath();
            ctx.moveTo(boid.history[0][0], boid.history[0][1]);
            for (const point of boid.history) {
                ctx.lineTo(point[0], point[1]);
            }
            ctx.stroke();
        }
        
        if (config.showMinDistance) {
            var a = 0.2;
            ctx.fillStyle = "rgba(85, 140, 244, " + a + ")";
            ctx.beginPath();
            ctx.arc(boid.x, boid.y,config.minDistance,0,2*Math.PI);
            ctx.fill();
        }
        if (config.showVisualRange) {
            var a = 0.5;
            ctx.strokeStyle = "rgba(85, 140, 244, " + a + ")";
            ctx.beginPath();
            ctx.arc(boid.x, boid.y,config.visualRange,0,2*Math.PI);
            ctx.stroke();
        }
    }

    function drawAllCanvas(){
                
        // Clear the canvas and redraw all the boids in their current positions
        const ctx = document.getElementById("boidsCanvas").getContext("2d");
        ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

        boids.forEach(boid => drawBoid(ctx, boid));

        //show mouse distance
        if ( ! mousePos.out && config.showMouseMinDistance){
            var a = 0.1;
            ctx.fillStyle = "rgba(100, 240, 240, " + a + ")";
            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, config.mouseMinDistance,0,2*Math.PI);
            ctx.fill();
        }

    }

    // Main animation loop
    function animationLoop() {
        // Update each boid
        for (let boid of boids) {
            if (config.applyRules){
                // Update the velocities according to each rule
                flyTowardsCenter(boid);
                avoidOthers(boid);
                matchVelocity(boid);
                avoidMouse(boid);
            }

            limitSpeed(boid);
            keepWithinBounds(boid);

            // Update the position based on the current velocity
            boid.x += boid.dx;
            boid.y += boid.dy;
            boid.history.push([boid.x, boid.y])
            boid.history = boid.history.slice(-50);
        }

        drawAllCanvas();

        // Schedule the next frame
        window.requestAnimationFrame(animationLoop);
    }

    window.onload = () => {
        // Make sure the canvas always fills the whole window
        window.addEventListener("resize", initCanvas, false);
        initCanvas();

        // Randomly distribute the boids to start
        initBoids();

        // Schedule the main animation loop
        window.requestAnimationFrame(animationLoop);
    };

    var config = new Vue({
        el: '#config',
        data: {
            applyRules  : true,
            matchVelocityFactor: 5,
            speedLimit  : 10,
            numBoids    : 60,
            visualRange : 75, 
            minDistance : 20, 
            drawTrail   : false,
            showMinDistance : false,
            showVisualRange : false,
            margin      : 100,
            avoidFactor : 5,
            centeringFactor     : 5,
            avoidMouseFactor    : 20,
            mouseMinDistance    : 50,
            showMouseMinDistance    : false 
        },
        watch: {
            // whenever numBoids changes, this function will run
            numBoids: _.debounce(initBoids, 500)
        },
        methods: {
            
        }
    })

})();
