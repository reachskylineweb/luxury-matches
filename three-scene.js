/* -------------------------------------------------------------
   BELL MATCHES - THREE.JS 3D CINEMATIC EXPERIENCES
------------------------------------------------------------- */

// Global config and texture helper
const GLOW_TEXTURE = (function() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.9)');
    gradient.addColorStop(0.5, 'rgba(240, 80, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    // Add to body temporarily if we need to inspect, otherwise return canvas texture
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
})();

const SMOKE_TEXTURE = (function() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(100, 100, 100, 0.15)');
    gradient.addColorStop(0.3, 'rgba(80, 80, 80, 0.08)');
    gradient.addColorStop(0.7, 'rgba(50, 50, 50, 0.02)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
})();

/* -------------------------------------------------------------
   1. PRELOADER SCENE MODULE
------------------------------------------------------------- */
const Preloader3D = (function() {
    let container, canvas, scene, camera, renderer;
    let matchstick, striker;
    let flameParticles = [], sparkParticles = [], emberParticles = [];
    let state = 'idle'; // 'idle', 'striking', 'ignited', 'done'
    let progress = 0;
    let clock = new THREE.Clock();
    let animationFrameId;
    let particlesGroup;

    function init() {
        container = document.getElementById('preloader');
        canvas = document.getElementById('preloader-canvas');
        if (!container || !canvas) return;

        // Size
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Scene & Camera
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xfaf6eb, 0.04);
        
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 12);

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffad5a, 0, 20); // Warm flame light (starts at 0)
        pointLight.position.set(0, 1, 1);
        scene.add(pointLight);

        const spotLight = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI / 6, 0.5, 1);
        spotLight.position.set(5, 10, 8);
        scene.add(spotLight);

        // Create Matchstick
        const matchstickGroup = new THREE.Group();
        
        // Wood Shaft
        const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8);
        const shaftMat = new THREE.MeshStandardMaterial({
            color: 0xD4B382,
            roughness: 0.8,
            metalness: 0.05
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.y = -2.25; // pivot at head
        matchstickGroup.add(shaft);

        // Match Head (Carbonized / Ignitable)
        const headGeo = new THREE.SphereGeometry(0.15, 16, 16);
        headGeo.scale(1, 1.4, 1); // oval shape
        const headMat = new THREE.MeshStandardMaterial({
            color: 0x242424,
            roughness: 0.9,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.1;
        matchstickGroup.add(head);

        matchstickGroup.position.set(0, 1, 0);
        matchstickGroup.rotation.z = Math.PI / 1.1; // almost upside down initially
        scene.add(matchstickGroup);
        matchstick = matchstickGroup;

        // Striking Plate
        const strikerGeo = new THREE.BoxGeometry(3, 0.1, 1);
        const strikerMat = new THREE.MeshStandardMaterial({
            color: 0x3a2010,
            roughness: 0.95,
            metalness: 0.1
        });
        striker = new THREE.Mesh(strikerGeo, strikerMat);
        striker.position.set(0, -6, 0); // start hidden below
        scene.add(striker);

        // Particle Group
        particlesGroup = new THREE.Group();
        scene.add(particlesGroup);

        // Event Listeners
        window.addEventListener('resize', onResize);

        // Start animation loop
        animate();
    }

    function onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Sparks creation
    function spawnSparks(position, count) {
        for (let i = 0; i < count; i++) {
            const geom = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 4, 4);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffdf54,
                transparent: true,
                opacity: 1,
                blending: THREE.NormalBlending
            });
            const spark = new THREE.Mesh(geom, mat);
            spark.position.copy(position);
            
            // Random direction, focused upwards & outwards
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            spark.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed * 0.5,
                    (Math.random() * 0.5 + 0.5) * speed,
                    (Math.random() - 0.5) * speed * 0.3
                ),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.04
            };
            particlesGroup.add(spark);
            sparkParticles.push(spark);
        }
    }

    // Flame particles
    function spawnFlameParticle(position) {
        const mat = new THREE.SpriteMaterial({
            map: GLOW_TEXTURE,
            color: 0xff6a00,
            transparent: true,
            opacity: 0.8,
            blending: THREE.NormalBlending
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(position);
        sprite.position.x += (Math.random() - 0.5) * 0.1;
        sprite.position.z += (Math.random() - 0.5) * 0.1;
        
        const scale = 0.5 + Math.random() * 0.4;
        sprite.scale.set(scale, scale * 1.5, scale);
        
        sprite.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                1.5 + Math.random() * 1.5,
                (Math.random() - 0.5) * 0.3
            ),
            scaleSpeed: 0.8 + Math.random() * 0.8,
            life: 1.0,
            decay: 0.03 + Math.random() * 0.03
        };
        
        particlesGroup.add(sprite);
        flameParticles.push(sprite);
    }

    // Embers
    function spawnEmberParticle(position) {
        const mat = new THREE.SpriteMaterial({
            map: GLOW_TEXTURE,
            color: 0xffba08,
            transparent: true,
            opacity: 0.9,
            blending: THREE.NormalBlending
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(position);
        
        const scale = 0.05 + Math.random() * 0.08;
        sprite.scale.set(scale, scale, scale);
        
        sprite.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                1.0 + Math.random() * 1.0,
                (Math.random() - 0.5) * 0.8
            ),
            wobbleSpeed: 2 + Math.random() * 5,
            wobbleAmp: 0.1 + Math.random() * 0.2,
            life: 1.0,
            decay: 0.015 + Math.random() * 0.015
        };
        
        particlesGroup.add(sprite);
        emberParticles.push(sprite);
    }

    function updateParticles(delta) {
        // Update Sparks
        for (let i = sparkParticles.length - 1; i >= 0; i--) {
            const p = sparkParticles[i];
            p.position.addScaledVector(p.userData.velocity, delta);
            p.userData.velocity.y -= 9.8 * delta; // gravity
            p.userData.life -= p.userData.decay;
            p.material.opacity = p.userData.life;
            
            if (p.userData.life <= 0) {
                particlesGroup.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                sparkParticles.splice(i, 1);
            }
        }

        // Update Flame
        for (let i = flameParticles.length - 1; i >= 0; i--) {
            const p = flameParticles[i];
            p.position.addScaledVector(p.userData.velocity, delta);
            p.userData.life -= p.userData.decay;
            
            // Fade and shrink
            p.material.opacity = p.userData.life * 0.8;
            const currentScale = (p.scale.x) * (1 - p.userData.scaleSpeed * delta);
            p.scale.set(currentScale, currentScale * 1.6, currentScale);
            
            // Shift color from white-yellow to orange-red
            if (p.userData.life > 0.6) {
                p.material.color.setHex(0xffffff);
            } else if (p.userData.life > 0.3) {
                p.material.color.setHex(0xffaa00);
            } else {
                p.material.color.setHex(0xff3300);
            }

            if (p.userData.life <= 0 || currentScale <= 0.05) {
                particlesGroup.remove(p);
                p.material.dispose();
                flameParticles.splice(i, 1);
            }
        }

        // Update Embers
        for (let i = emberParticles.length - 1; i >= 0; i--) {
            const p = emberParticles[i];
            p.position.addScaledVector(p.userData.velocity, delta);
            p.userData.life -= p.userData.decay;
            p.material.opacity = p.userData.life;
            
            // Sinuous movement
            p.position.x += Math.sin(clock.getElapsedTime() * p.userData.wobbleSpeed) * p.userData.wobbleAmp * delta;

            if (p.userData.life <= 0) {
                particlesGroup.remove(p);
                p.material.dispose();
                emberParticles.splice(i, 1);
            }
        }
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        
        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = clock.getElapsedTime();

        // Loading Timeline control based on progress percentage
        if (state === 'idle') {
            // Slow elegant rotation
            matchstick.rotation.y = elapsedTime * 0.4;
            matchstick.rotation.z = Math.PI / 1.1 + Math.sin(elapsedTime) * 0.03;
            
            // Slowly center matchstick
            matchstick.position.y = 1 + Math.sin(elapsedTime * 2) * 0.15;
            
            // Striker rises at 15% progress
            if (progress >= 15 && striker.position.y < -3.2) {
                striker.position.y += 3 * delta;
            }

            // Begin strike sequence at 35% progress
            if (progress >= 35) {
                state = 'striking';
            }
        } 
        else if (state === 'striking') {
            // Tilt matchstick to touch the striker
            gsap.to(matchstick.rotation, {
                z: Math.PI / 2.3, // angle of strike
                x: 0.3,
                duration: 0.5,
                ease: "power2.inOut"
            });
            gsap.to(matchstick.position, {
                x: -1.2,
                y: -3.0,
                duration: 0.5,
                ease: "power2.inOut",
                onComplete: () => {
                    // Strike sweep
                    gsap.to(matchstick.position, {
                        x: 1.0,
                        duration: 0.3,
                        ease: "sine.inOut",
                        onUpdate: () => {
                            // Spawn sparks at the head position during sweep
                            const headPos = new THREE.Vector3();
                            matchstick.children[1].getWorldPosition(headPos);
                            spawnSparks(headPos, 6);
                        },
                        onComplete: () => {
                            // Ignite!
                            state = 'ignited';
                            // Point light brightness
                            const headPos = new THREE.Vector3();
                            matchstick.children[1].getWorldPosition(headPos);
                            
                            // Light up!
                            const fireLight = scene.children.find(c => c.isPointLight);
                            if (fireLight) {
                                fireLight.position.copy(headPos);
                                gsap.to(fireLight, { intensity: 4, distance: 15, duration: 0.4 });
                            }

                            // Animate matchstick lifting up triumphantly
                            gsap.to(matchstick.position, {
                                x: 0,
                                y: -0.5,
                                duration: 1.0,
                                ease: "power3.out"
                            });
                            gsap.to(matchstick.rotation, {
                                x: 0,
                                z: 0, // vertical
                                duration: 1.0,
                                ease: "power3.out"
                            });
                            // Striker recedes
                            gsap.to(striker.position, {
                                y: -7,
                                duration: 1.0,
                                ease: "power3.in"
                            });
                        }
                    });
                }
            });
            // Transition state block
            progress = Math.max(progress, 45);
        }
        else if (state === 'ignited') {
            // Matchstick floats gently while burning
            matchstick.rotation.y = elapsedTime * 0.2;
            matchstick.rotation.z = Math.sin(elapsedTime * 2.5) * 0.015;
            matchstick.position.y = -0.5 + Math.sin(elapsedTime * 1.5) * 0.05;

            // Get head position for particle spawning
            const headPos = new THREE.Vector3();
            matchstick.children[1].getWorldPosition(headPos);

            // Continuously spawn flame and embers
            if (elapsedTime % 0.05 < delta) {
                spawnFlameParticle(headPos);
            }
            if (Math.random() < 0.15) {
                spawnEmberParticle(headPos);
            }

            // Slowly carbonize head color
            const headMat = matchstick.children[1].material;
            if (headMat.color.r > 0.05) {
                headMat.color.r -= 0.02 * delta;
                headMat.color.g -= 0.02 * delta;
                headMat.color.b -= 0.02 * delta;
            }

            // Sync dynamic light flicker
            const fireLight = scene.children.find(c => c.isPointLight);
            if (fireLight) {
                fireLight.position.copy(headPos);
                fireLight.intensity = 4 + Math.sin(elapsedTime * 20) * 0.5;
            }
        }

        updateParticles(delta);
        renderer.render(scene, camera);
    }

    function setProgress(val) {
        progress = val;
    }

    function destroy() {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onResize);
        
        // Dispose Three.js objects
        scene.traverse(object => {
            if (!object.isMesh) return;
            object.geometry.dispose();
            
            if (object.material.isMaterial) {
                cleanMaterial(object.material);
            } else {
                for (const material of object.material) {
                    cleanMaterial(material);
                }
            }
        });

        // Clean flame, spark sprite arrays
        flameParticles.forEach(p => p.material.dispose());
        emberParticles.forEach(p => p.material.dispose());
        
        renderer.dispose();
        scene = null;
        camera = null;
        renderer = null;
        
        container.style.display = 'none';
    }

    function cleanMaterial(material) {
        material.dispose();
        for (const key of Object.keys(material)) {
            if (material[key] && typeof material[key].dispose === 'function') {
                material[key].dispose();
            }
        }
    }

    return {
        init: init,
        setProgress: setProgress,
        destroy: destroy,
        getState: () => state
    };
})();


/* -------------------------------------------------------------
   2. HERO 3D SCENE MODULE (3D MATCHBOX)
------------------------------------------------------------- */
const Hero3D = (function() {
    let container, canvas, scene, camera, renderer;
    let matchboxGroup, outerSleeve, innerDrawer;
    let matchsticks = [], premiumMatchstick;
    let flameParticles = [], sparkParticles = [], emberParticles = [];
    let fireLight;
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let clock = new THREE.Clock();
    let isDrawingOpen = false;
    let isIgnited = false;
    let isRendering = false;
    let animationFrameId;

    // Dimensions (Vertical Box Layout)
    const boxW = 2.5;  // Short width along X
    const boxH = 4.2;  // Long height along Y
    const boxD = 1.15; // Thickness along Z

    function init() {
        container = document.getElementById('hero-3d-container');
        canvas = document.getElementById('hero-canvas');
        if (!container || !canvas) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        
        // Camera
        camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        camera.position.set(0, 0, 9.5);

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);

        // Main cinematic spotlight
        const spotLight = new THREE.SpotLight(0xfff3d1, 6, 30, Math.PI / 5, 0.6, 1.2);
        spotLight.position.set(4, 8, 7);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        spotLight.shadow.bias = -0.001;
        scene.add(spotLight);

        // Soft ambient gold light for rich warm contrast
        const goldFillLight = new THREE.DirectionalLight(0xd4af37, 1.5);
        goldFillLight.position.set(-5, -3, 3);
        scene.add(goldFillLight);

        // Flame light
        fireLight = new THREE.PointLight(0xff8822, 0, 10);
        scene.add(fireLight);

        // Load Classic Box texture
        const textureLoader = new THREE.TextureLoader();
        
        // Generate placeholder texture canvas if image fails to load
        const fallbackTopTexture = createBoxCoverTexture();

        // Materials setup for Outer Box Sleeve (6 faces)
        // Right, Left (X faces): Striker surfaces
        // Top, Bottom (Y faces): Open hollow edges (gold border)
        // Front, Back (Z faces): Brand cover label (classic_box.png)
        const borderMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2,
            clearcoat: 1.0
        });

        const strikerMaterial = new THREE.MeshStandardMaterial({
            color: 0x2e190e,
            roughness: 0.95,
            metalness: 0.05
        });

        // Try to load assets/images/classic_box.png
        let topMat;
        try {
            const boxTex = textureLoader.load('assets/images/classic_box.png', 
                function(tex) {
                    tex.generateMipmaps = true;
                    tex.minFilter = THREE.LinearMipmapLinearFilter;
                    // Trigger renderer update when image finishes loading
                    if (!isRendering) renderer.render(scene, camera);
                },
                undefined,
                function(err) {
                    console.warn("Classic Box image failed to load, generating procedural fallback.");
                }
            );
            
            topMat = new THREE.MeshPhysicalMaterial({
                map: boxTex,
                roughness: 0.35,
                metalness: 0.2,
                clearcoat: 0.6,
                clearcoatRoughness: 0.2
            });
        } catch(e) {
            topMat = new THREE.MeshPhysicalMaterial({
                map: fallbackTopTexture,
                roughness: 0.3,
                metalness: 0.3,
                clearcoat: 0.8
            });
        }

        const sleeveMaterials = [
            strikerMaterial,    // Right (Striker friction)
            strikerMaterial,    // Left (Striker friction)
            borderMaterial,     // Top (open end)
            borderMaterial,     // Bottom (open end)
            topMat,             // Front (Cover Image)
            topMat              // Back (Cover Image)
        ];

        // 3D Matchbox Group
        matchboxGroup = new THREE.Group();
        scene.add(matchboxGroup);

        // 1. Outer Sleeve Mesh
        const sleeveGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
        outerSleeve = new THREE.Mesh(sleeveGeo, sleeveMaterials);
        outerSleeve.castShadow = true;
        outerSleeve.receiveShadow = true;
        matchboxGroup.add(outerSleeve);

        // 2. Inner Drawer
        innerDrawer = new THREE.Group();
        
        // Drawer Box tray (Kraft cardboard)
        const trayMat = new THREE.MeshStandardMaterial({
            color: 0xf5f3ea, // clean kraft cardstock
            roughness: 0.85
        });

        // Tray bottom
        const trayBottom = new THREE.Mesh(new THREE.BoxGeometry(boxW - 0.04, 0.02, boxD - 0.04), trayMat);
        trayBottom.position.y = -boxH/2 + 0.01;
        innerDrawer.add(trayBottom);

        // Tray left wall
        const trayLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, boxH - 0.02, boxD - 0.04), trayMat);
        trayLeft.position.x = -boxW/2 + 0.01;
        innerDrawer.add(trayLeft);

        // Tray right wall
        const trayRight = new THREE.Mesh(new THREE.BoxGeometry(0.02, boxH - 0.02, boxD - 0.04), trayMat);
        trayRight.position.x = boxW/2 - 0.01;
        innerDrawer.add(trayRight);

        // Tray back wall (Front is left open to see matches clearly)
        const trayBack = new THREE.Mesh(new THREE.BoxGeometry(boxW - 0.04, boxH - 0.02, 0.02), trayMat);
        trayBack.position.z = -boxD/2 + 0.01;
        innerDrawer.add(trayBack);

        // Gold trim drawer top plate (visible at the top open sleeve when closed)
        const drawerFrontPlate = new THREE.Mesh(
            new THREE.BoxGeometry(boxW - 0.02, 0.03, boxD - 0.02),
            new THREE.MeshPhysicalMaterial({
                color: 0xaa7c11,
                metalness: 0.9,
                roughness: 0.15,
                clearcoat: 0.5
            })
        );
        drawerFrontPlate.position.y = boxH/2 - 0.015;
        innerDrawer.add(drawerFrontPlate);

        // 3. Fill with row of matchsticks standing vertically
        const matchCount = 12;
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xe6cbab, roughness: 0.75 });
        const redTipMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.9 }); // carbonized tips
        
        for (let i = 0; i < matchCount; i++) {
            const stick = new THREE.Group();
            
            // shaft (vertical)
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.2, 0.06), woodMat);
            stick.add(shaft);
            
            // head (top of shaft)
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), redTipMat);
            head.position.y = 1.6;
            head.scale.set(1, 1.4, 1);
            stick.add(head);

            // layout in drawer
            stick.position.set(
                -0.9 + i * 0.16 + (Math.random() - 0.5) * 0.02, 
                -0.3, 
                (Math.random() - 0.5) * 0.15
            );
            stick.rotation.y = (Math.random() - 0.5) * 0.1;
            
            innerDrawer.add(stick);
            matchsticks.push(stick);
        }

        // 4. One Premium Gold-Tipped Matchstick that slides out and ignites
        premiumMatchstick = new THREE.Group();
        const pShaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.3, 0.06), woodMat);
        pShaft.castShadow = true;
        premiumMatchstick.add(pShaft);

        const pHead = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 12),
            new THREE.MeshPhysicalMaterial({
                color: 0xd4af37, // Gold tip!
                metalness: 0.8,
                roughness: 0.2,
                clearcoat: 0.8
            })
        );
        pHead.position.y = 1.65;
        pHead.scale.set(1.1, 1.5, 1.1);
        pHead.castShadow = true;
        premiumMatchstick.add(pHead);

        // Put premium match in front center
        premiumMatchstick.position.set(0, -0.3, 0.25); 
        innerDrawer.add(premiumMatchstick);

        matchboxGroup.add(innerDrawer);

        // Scale the matchbox down to a medium size that fits the viewport frame
        matchboxGroup.scale.set(0.55, 0.55, 0.55);

        // Position & Rotate matchbox initially (Standing Vertical)
        matchboxGroup.position.set(1.1, -0.4, 0); 
        matchboxGroup.rotation.set(0.35, -0.45, 0.05);

        // Handle Mouse Movement
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('resize', onResize);

        // Adjust positioning for small screens
        responsiveLayout();

        // Start render loop
        isRendering = true;
        animate();

        // ScrollTrigger to trigger Drawer sliding and Ignition
        setupScrollAnimations();
    }

    function createBoxCoverTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, 512, 512);

        // Gold border lines
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, 472, 472);
        ctx.lineWidth = 2;
        ctx.strokeRect(32, 32, 448, 448);

        // Text
        ctx.fillStyle = '#F5F5F7';
        ctx.font = '24px Cormorant Garamond, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '12px';
        ctx.fillText('EST. 1976', 256, 120);

        ctx.fillStyle = '#D4AF37';
        ctx.font = '300 48px Cormorant Garamond, serif';
        ctx.letterSpacing = '8px';
        ctx.fillText('BELL MATCHES', 256, 230);

        ctx.fillStyle = '#86868B';
        ctx.font = '16px Plus Jakarta Sans, sans-serif';
        ctx.letterSpacing = '4px';
        ctx.fillText('IGNITING TRADITIONS', 256, 360);
        ctx.fillText('CRAFTING EXCELLENCE', 256, 390);

        return new THREE.CanvasTexture(canvas);
    }

    function responsiveLayout() {
        if (window.innerWidth < 992) {
            matchboxGroup.position.set(0, -1.3, 0); // Center below text in mobile/tablet
            camera.position.set(0, 0, 8.8);
            matchboxGroup.scale.set(0.45, 0.45, 0.45); // Scale down slightly on tablet/mobile
        } else {
            matchboxGroup.position.set(1.1, -0.4, 0); // Offset right in desktop
            camera.position.set(0, 0, 9.5);
            matchboxGroup.scale.set(0.55, 0.55, 0.55); // Original size
        }
    }

    function onMouseMove(e) {
        // Normalize mouse positions to [-1, 1]
        mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        responsiveLayout();
    }

    function setupScrollAnimations() {
        // Trigger drawer open & strike on page load/scroll trigger
        setTimeout(triggerRevealSequence, 2000); // Trigger 2s after preloader fades out
    }

    function triggerRevealSequence() {
        if (isDrawingOpen) return;
        isDrawingOpen = true;

        // Slide drawer out UPWARDS along Y
        gsap.to(innerDrawer.position, {
            y: 1.6, 
            duration: 1.8,
            ease: "power3.inOut"
        });
    }

    // Sparks creation
    function spawnSparks(position, count) {
        for (let i = 0; i < count; i++) {
            const geom = new THREE.SphereGeometry(0.015 + Math.random() * 0.02, 4, 4);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffdf54,
                transparent: true,
                opacity: 1,
                blending: THREE.NormalBlending
            });
            const spark = new THREE.Mesh(geom, mat);
            spark.position.copy(position);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            spark.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed * 0.4,
                    (Math.random() * 0.5 + 0.5) * speed,
                    (Math.random() - 0.5) * speed * 0.4
                ),
                life: 1.0,
                decay: 0.03 + Math.random() * 0.04
            };
            scene.add(spark);
            sparkParticles.push(spark);
        }
    }

    // Flame particles
    function spawnFlameParticle(position) {
        const mat = new THREE.SpriteMaterial({
            map: GLOW_TEXTURE,
            color: 0xff7700,
            transparent: true,
            opacity: 0.85,
            blending: THREE.NormalBlending
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(position);
        sprite.position.x += (Math.random() - 0.5) * 0.06;
        sprite.position.z += (Math.random() - 0.5) * 0.06;
        
        const scale = 0.35 + Math.random() * 0.35;
        sprite.scale.set(scale, scale * 1.5, scale);
        
        sprite.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                1.0 + Math.random() * 1.0,
                (Math.random() - 0.5) * 0.15
            ),
            scaleSpeed: 0.9 + Math.random() * 0.9,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.04
        };
        
        scene.add(sprite);
        flameParticles.push(sprite);
    }

    // Embers
    function spawnEmberParticle(position) {
        const mat = new THREE.SpriteMaterial({
            map: GLOW_TEXTURE,
            color: 0xffba08,
            transparent: true,
            opacity: 0.9,
            blending: THREE.NormalBlending
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(position);
        
        const scale = 0.03 + Math.random() * 0.05;
        sprite.scale.set(scale, scale, scale);
        
        sprite.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.6,
                0.8 + Math.random() * 0.8,
                (Math.random() - 0.5) * 0.6
            ),
            wobbleSpeed: 3 + Math.random() * 4,
            wobbleAmp: 0.1 + Math.random() * 0.15,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        };
        
        scene.add(sprite);
        emberParticles.push(sprite);
    }

    function updateParticles(delta) {
        // Sparks
        for (let i = sparkParticles.length - 1; i >= 0; i--) {
            const p = sparkParticles[i];
            p.position.addScaledVector(p.userData.velocity, delta);
            p.userData.velocity.y -= 7.0 * delta; // gravity
            p.userData.life -= p.userData.decay;
            p.material.opacity = p.userData.life;
            if (p.userData.life <= 0) {
                scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                sparkParticles.splice(i, 1);
            }
        }

        // Flame
        for (let i = flameParticles.length - 1; i >= 0; i--) {
            const p = flameParticles[i];
            p.position.addScaledVector(p.userData.velocity, delta);
            p.userData.life -= p.userData.decay;
            p.material.opacity = p.userData.life * 0.85;
            const currentScale = (p.scale.x) * (1 - p.userData.scaleSpeed * delta);
            p.scale.set(currentScale, currentScale * 1.5, currentScale);
            
            if (p.userData.life > 0.65) {
                p.material.color.setHex(0xffffff);
            } else if (p.userData.life > 0.35) {
                p.material.color.setHex(0xff9f00);
            } else {
                p.material.color.setHex(0xff2200);
            }

            if (p.userData.life <= 0 || currentScale <= 0.03) {
                scene.remove(p);
                p.material.dispose();
                flameParticles.splice(i, 1);
            }
        }

        // Embers
        for (let i = emberParticles.length - 1; i >= 0; i--) {
            const p = emberParticles[i];
            p.position.addScaledVector(p.userData.velocity, delta);
            p.userData.life -= p.userData.decay;
            p.material.opacity = p.userData.life;
            p.position.x += Math.sin(clock.getElapsedTime() * p.userData.wobbleSpeed) * p.userData.wobbleAmp * delta;

            if (p.userData.life <= 0) {
                scene.remove(p);
                p.material.dispose();
                emberParticles.splice(i, 1);
            }
        }
    }

    function animate() {
        if (!isRendering) return;
        animationFrameId = requestAnimationFrame(animate);

        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = clock.getElapsedTime();

        // 1. Mouse Lerp
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;

        // 2. Apply gentle floating rotation
        if (matchboxGroup) {
            matchboxGroup.rotation.y = -0.45 + mouse.x * 0.25 + Math.sin(elapsedTime * 0.8) * 0.05;
            matchboxGroup.rotation.x = 0.35 + mouse.y * 0.2 + Math.cos(elapsedTime * 0.6) * 0.03;
            matchboxGroup.position.y = (window.innerWidth < 992 ? -1.3 : -0.4) + Math.sin(elapsedTime * 1.2) * 0.12;
        }

        // 3. Flame Spawning
        if (isIgnited) {
            const headPos = new THREE.Vector3();
            premiumMatchstick.children[1].getWorldPosition(headPos);

            if (elapsedTime % 0.05 < delta) {
                spawnFlameParticle(headPos);
            }
            if (Math.random() < 0.12) {
                spawnEmberParticle(headPos);
            }

            // Flickering light
            fireLight.position.copy(headPos);
            fireLight.intensity = 2.5 + Math.sin(elapsedTime * 25) * 0.4;
        }

        updateParticles(delta);
        renderer.render(scene, camera);
    }

    function updateScroll(progress) {
        if (!innerDrawer) return;

        // Close drawer downwards along Y
        // When progress goes from 0 to 0.8, drawer slides back from 1.6 to 0
        const drawerY = 1.6 * Math.max(0, 1 - (progress * 1.25));
        innerDrawer.position.y = drawerY;
    }

    function setRendering(value) {
        isRendering = value;
        if (isRendering) {
            clock.getDelta(); // reset clock
            animate();
        } else {
            cancelAnimationFrame(animationFrameId);
        }
    }

    return {
        init: init,
        setRendering: setRendering,
        updateScroll: updateScroll
    };
})();
