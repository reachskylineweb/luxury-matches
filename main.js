/* -------------------------------------------------------------
   BELL MATCHES - MAIN PAGE INTERACTIONS & ANIMATIONS
------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Initialize core items
    initPreloader();
});

/* -------------------------------------------------------------
   1. PRELOADER & HERO REVEAL CONTROLLER
------------------------------------------------------------- */
function initPreloader() {
    // Initialize 3D preloader scene
    Preloader3D.init();

    const fill = document.getElementById('loader-fill');
    const spark = document.getElementById('loader-spark');
    const percent = document.getElementById('loader-percentage');
    
    let currentProgress = 0;
    
    // Simulate loading with luxury pacing (accelerates & decelerates)
    const loadInterval = setInterval(() => {
        // Random increments to feel human/cinematic
        const increment = Math.floor(Math.random() * 4) + 1;
        currentProgress = Math.min(currentProgress + increment, 100);
        
        // Update Three.js preloader state
        Preloader3D.setProgress(currentProgress);
        
        // Update DOM
        if (fill) fill.style.width = `${currentProgress}%`;
        if (spark) {
            spark.style.display = 'block';
            spark.style.left = `${currentProgress}%`;
        }
        if (percent) {
            // Format to double digit string (e.g. 05%, 45%)
            percent.textContent = `${currentProgress.toString().padStart(2, '0')}%`;
        }
        
        // Trigger preloader elements fade-ins (robust thresholds instead of exact matches)
        if (currentProgress >= 10 && !window.preloaderLogoAnimated) {
            window.preloaderLogoAnimated = true;
            gsap.to('.brand-logo-container', { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });
        }
        if (currentProgress >= 20 && !window.preloaderWrapAnimated) {
            window.preloaderWrapAnimated = true;
            gsap.to('.loader-progress-wrap', { opacity: 1, duration: 0.8 });
            gsap.to('.loader-status', { opacity: 0.8, duration: 0.8 });
        }
        
        // Complete state
        if (currentProgress >= 100) {
            clearInterval(loadInterval);
            
            // Wait for WebGL preloader to be in 'ignited' state before transitioning out
            const checkState = setInterval(() => {
                if (Preloader3D.getState() === 'ignited' || Preloader3D.getState() === 'done') {
                    clearInterval(checkState);
                    setTimeout(transitionToHomepage, 1200); // Let the flame burn for a second
                }
            }, 100);
        }
    }, 100);
}

function transitionToHomepage() {
    const tl = gsap.timeline({
        onComplete: () => {
            // Destroy preloader webGL to free GPU resource
            Preloader3D.destroy();
            
            // Init Hero WebGL scene
            Hero3D.init();
            
            // Setup Hero close on scroll trigger
            setupHeroScrollTrigger();
            
            // Observe hero section viewport to pause loop when scrolled away
            setupPerformanceObserver();
            
            // Initialize other sections scroll behaviors
            initLenisScroll();
            initAnimations();
            initCarousel();
            initMap();
            initContactForm();
            initMobileMenu();
            initTestimonialsMarquee();
        }
    });

    // Fade loader details
    tl.to('.preloader-overlay, .preloader-content', {
        opacity: 0,
        y: -30,
        duration: 1.0,
        ease: 'power3.inOut'
    });

    // Slide up/fade preloader dark screen
    tl.to('#preloader', {
        yPercent: -100,
        duration: 1.2,
        ease: 'power4.inOut'
    }, '-=0.5');

    // Reveal Header & Hero Content
    tl.fromTo('header', {
        y: -100,
        opacity: 0
    }, {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out'
    }, '-=0.8');

    // Hero headline masked reveal
    tl.fromTo('.hero-tagline', {
        opacity: 0,
        y: 20
    }, {
        opacity: 1,
        y: 0,
        duration: 1.0,
        ease: 'power3.out'
    }, '-=0.9');

    tl.fromTo('.reveal-line', {
        yPercent: 100
    }, {
        yPercent: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power4.out'
    }, '-=1.0');

    tl.fromTo('.hero-subtitle', {
        opacity: 0,
        y: 30
    }, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power3.out'
    }, '-=1.0');

    tl.fromTo('.hero-actions .btn', {
        opacity: 0,
        y: 20
    }, {
        opacity: 1,
        y: 0,
        stagger: 0.15,
        duration: 1.0,
        ease: 'power3.out',
        onComplete: () => {
            // Enable magnetic buttons
            initMagneticButtons();
        }
    }, '-=0.9');

    tl.fromTo('.scroll-indicator', {
        opacity: 0
    }, {
        opacity: 1,
        duration: 0.8
    }, '-=0.5');
}

/* -------------------------------------------------------------
   2. LENIS SMOOTH SCROLL INTEGRATION
------------------------------------------------------------- */
let lenis;

function initLenisScroll() {
    lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Apple-like ease out
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    // Connect Lenis to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Smooth anchor link scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if active
                const mobileMenu = document.getElementById('mobile-menu');
                const menuToggle = document.querySelector('.mobile-nav-toggle');
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
                
                // Ensure Lenis scroll is active before moving
                if (lenis) lenis.start();
                
                lenis.scrollTo(targetElement, {
                    offset: -50,
                    duration: 1.5
                });
            }
        });
    });
}

/* -------------------------------------------------------------
   3. SECTION CONTENT REVEALS & TIMELINES
------------------------------------------------------------- */
function initAnimations() {
    // Fade/Slide triggers for general elements (Rolex style)
    const revealItems = document.querySelectorAll('.scroll-reveal-item');
    revealItems.forEach(item => {
        gsap.fromTo(item, 
            {
                opacity: 0,
                y: 50
            }, 
            {
                opacity: 1,
                y: 0,
                duration: 1.2,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            }
        );
    });

    // Header transparency change on scroll
    ScrollTrigger.create({
        start: 'top -50px',
        onEnter: () => document.getElementById('main-header').classList.add('header-glass'),
        onLeaveBack: () => document.getElementById('main-header').classList.remove('header-glass')
    });

    // Heritage Section Timeline Progress
    const timeline = document.querySelector('.timeline-container');
    if (timeline) {
        // Line progress growth
        gsap.fromTo('.timeline-progress', 
            {
                height: '0%'
            }, 
            {
                height: '100%',
                ease: 'none',
                scrollTrigger: {
                    trigger: '.timeline-container',
                    start: 'top 60%',
                    end: 'bottom 60%',
                    scrub: true
                }
            }
        );

        // Highlight timeline nodes and cards as scroll crosses
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            ScrollTrigger.create({
                trigger: item,
                start: 'top 60%',
                end: 'bottom 40%',
                onEnter: () => item.classList.add('active-dot'),
                onLeaveBack: () => item.classList.remove('active-dot')
            });
        });
    }

    // Statistics Counter Scroll Animation
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(num => {
        const target = parseInt(num.getAttribute('data-target'), 10);
        
        gsap.fromTo(num, 
            {
                innerText: 0
            }, 
            {
                innerText: target,
                duration: 2.0,
                ease: 'power3.out',
                snap: { innerText: 1 },
                scrollTrigger: {
                    trigger: num,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            }
        );
    });
}

/* -------------------------------------------------------------
   4. APPLE-STYLE 3D CAROUSEL
------------------------------------------------------------- */
function initCarousel() {
    const track = document.getElementById('carousel-track');
    const slides = Array.from(document.querySelectorAll('.carousel-slide'));
    const dots = Array.from(document.querySelectorAll('.carousel-dot'));
    const btnNext = document.querySelector('.carousel-btn.btn-next');
    const btnPrev = document.querySelector('.carousel-btn.btn-prev');
    
    if (!track || slides.length === 0) return;
    
    let currentIndex = 0;

    function updateCarousel() {
        slides.forEach((slide, idx) => {
            // Clean classes
            slide.classList.remove('active', 'prev-1', 'next-1', 'prev-2', 'next-2');
            
            if (idx === currentIndex) {
                slide.classList.add('active');
            } else if (idx === currentIndex - 1) {
                slide.classList.add('prev-1');
            } else if (idx === currentIndex + 1) {
                slide.classList.add('next-1');
            } else if (idx === currentIndex - 2) {
                slide.classList.add('prev-2');
            } else if (idx === currentIndex + 2) {
                slide.classList.add('next-2');
            } else if (idx < currentIndex) {
                // Out of range left
                slide.style.transform = 'scale(0.5) translate3d(-800px, 0, -300px)';
                slide.style.opacity = '0';
            } else if (idx > currentIndex) {
                // Out of range right
                slide.style.transform = 'scale(0.5) translate3d(800px, 0, -300px)';
                slide.style.opacity = '0';
            }
        });

        // Update dot indicators
        dots.forEach((dot, idx) => {
            if (idx === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Button controls
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (currentIndex < slides.length - 1) {
                currentIndex++;
            } else {
                currentIndex = 0; // loop
            }
            updateCarousel();
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
            } else {
                currentIndex = slides.length - 1; // loop
            }
            updateCarousel();
        });
    }

    // Dot controls
    dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            currentIndex = parseInt(e.target.getAttribute('data-index'), 10);
            updateCarousel();
        });
    });

    // Touch Swipe Support for Carousel
    let startX = 0;
    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    track.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        if (Math.abs(diffX) > 50) { // threshold
            if (diffX > 0 && currentIndex < slides.length - 1) {
                currentIndex++;
            } else if (diffX < 0 && currentIndex > 0) {
                currentIndex--;
            }
            updateCarousel();
        }
    });

    // Initialize layout
    updateCarousel();
}

/* -------------------------------------------------------------
   5. INTERACTIVE EXPORT MAP
------------------------------------------------------------- */
function initMap() {
    const markers = document.querySelectorAll('.map-marker');
    const tooltip = document.getElementById('map-tooltip');
    const mapContainer = document.querySelector('.map-container');
    
    if (markers.length === 0 || !tooltip) return;

    // Helper to position tooltip relative to marker element
    function positionTooltipAtMarker(marker) {
        const rect = mapContainer.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        
        // Calculate position relative to map container
        const posX = markerRect.left - rect.left + (markerRect.width / 2);
        const posY = markerRect.top - rect.top - tooltip.offsetHeight - 12;
        
        tooltip.style.left = `${posX}px`;
        tooltip.style.top = `${posY}px`;
        tooltip.style.transform = 'translateX(-50%)'; // center horizontally
    }

    function deactivateAllNodes() {
        markers.forEach(m => {
            m.classList.remove('active-node');
        });
        document.querySelectorAll('.map-connection-line').forEach(line => {
            line.style.opacity = '';
            line.style.strokeWidth = '';
            line.style.stroke = '';
        });
        mapContainer.classList.remove('map-active-state');
        tooltip.style.opacity = '0';
    }

    function activateNode(marker) {
        const city = marker.getAttribute('data-city') || "HQ - Manufacturing";
        const info = marker.getAttribute('data-info') || "Precision match formulation, global logistics hub.";
        
        tooltip.querySelector('.tooltip-city').textContent = city;
        tooltip.querySelector('.tooltip-info').textContent = info;
        
        // Highlighting connection lines:
        if (city.toLowerCase().includes('factory') || city.toLowerCase().includes('hq')) {
            // Highlight all export connection lines emanating from HQ
            document.querySelectorAll('.map-connection-line').forEach(line => {
                line.style.opacity = '0.85';
                line.style.strokeWidth = '1.8';
                line.style.stroke = '#AB8A2C';
            });
        } else {
            const routeId = `route-${city.toLowerCase().replace(' ', '')}`;
            const line = document.getElementById(routeId);
            if (line) {
                line.style.opacity = '0.85';
                line.style.strokeWidth = '2';
                line.style.stroke = '#AB8A2C';
            }
        }
        
        marker.classList.add('active-node');
        mapContainer.classList.add('map-active-state');
        tooltip.style.opacity = '1';
    }

    markers.forEach(marker => {
        // Handle Hover (Desktop)
        marker.addEventListener('mouseenter', (e) => {
            if (window.matchMedia('(hover: hover)').matches) {
                activateNode(marker);
                tooltip.style.transform = ''; // reset center transform
            }
        });

        marker.addEventListener('mousemove', (e) => {
            if (window.matchMedia('(hover: hover)').matches) {
                const rect = mapContainer.getBoundingClientRect();
                const posX = e.clientX - rect.left + 20;
                const posY = e.clientY - rect.top + 20;
                
                tooltip.style.left = `${posX}px`;
                tooltip.style.top = `${posY}px`;
                tooltip.style.transform = ''; // reset center transform
            }
        });

        marker.addEventListener('mouseleave', (e) => {
            if (window.matchMedia('(hover: hover)').matches) {
                deactivateAllNodes();
            }
        });

        // Handle Click/Touch (Mobile & Tablet)
        marker.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop click from propagating to document
            
            const isAlreadyActive = marker.classList.contains('active-node');
            
            deactivateAllNodes();
            
            if (!isAlreadyActive) {
                activateNode(marker);
                // Position above the node
                positionTooltipAtMarker(marker);
            }
        });
    });

    // Tap outside to close tooltips on mobile/tablet
    document.addEventListener('click', () => {
        deactivateAllNodes();
    });

    // Highlight Srivilliputhur HQ Node by default on mobile/tablet screens initially
    if (window.innerWidth < 768) {
        const hqNode = document.querySelector('.map-marker.hq');
        if (hqNode) {
            setTimeout(() => {
                deactivateAllNodes();
                activateNode(hqNode);
                positionTooltipAtMarker(hqNode);
            }, 1200);
        }
    }
}

/* -------------------------------------------------------------
   6. LUXURY CONTACT FORM VALIDATION
------------------------------------------------------------- */
function initContactForm() {
    const form = document.getElementById('inquiry-form');
    if (!form) return;

    const inputs = form.querySelectorAll('.form-input');

    // Input interaction hooks to clear errors on keyup
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const group = input.closest('.floating-group');
            if (group && group.classList.contains('has-error')) {
                group.classList.remove('has-error');
            }
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;
        
        // Name validation
        const nameInput = document.getElementById('name');
        if (nameInput.value.trim() === '') {
            nameInput.closest('.floating-group').classList.add('has-error');
            isValid = false;
        }

        // Email validation
        const emailInput = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
            emailInput.closest('.floating-group').classList.add('has-error');
            isValid = false;
        }

        // Message validation
        const messageInput = document.getElementById('message');
        if (messageInput.value.trim() === '') {
            messageInput.closest('.floating-group').classList.add('has-error');
            isValid = false;
        }

        if (isValid) {
            // Show Success overlay
            const successOverlay = document.getElementById('form-success');
            successOverlay.classList.add('active');
            
            // Reset form fields
            form.reset();

            // Auto-hide success overlay after 6s
            setTimeout(() => {
                successOverlay.classList.remove('active');
            }, 6000);
        }
    });
}

/* -------------------------------------------------------------
   7. MAGNETIC BUTTON INTERACTION (Apple/Rolex Micro-UX)
------------------------------------------------------------- */
function initMagneticButtons() {
    const magButtons = document.querySelectorAll('.btn-magnetic');
    
    magButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            // Cursor coordinates relative to button center
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            // Pull the button towards cursor slightly (magnetic effect)
            gsap.to(btn, {
                x: x * 0.35,
                y: y * 0.35,
                duration: 0.3,
                ease: 'power2.out'
            });
            
            // Pull the text layer slightly more (depth layers)
            const text = btn.querySelector('.btn-text');
            if (text) {
                gsap.to(text, {
                    x: x * 0.15,
                    y: y * 0.15,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
        });
        
        btn.addEventListener('mouseleave', () => {
            // Snap back
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.6,
                ease: 'elastic.out(1.2, 0.4)'
            });
            
            const text = btn.querySelector('.btn-text');
            if (text) {
                gsap.to(text, {
                    x: 0,
                    y: 0,
                    duration: 0.6,
                    ease: 'elastic.out(1.2, 0.4)'
                });
            }
        });
    });
}

/* -------------------------------------------------------------
   8. PERFORMANCE TUNING (PAUSE OFFSCREEN WebGL RENDERER)
------------------------------------------------------------- */
function setupPerformanceObserver() {
    const heroSection = document.getElementById('hero');
    if (!heroSection) return;

    // Use intersection observer to shut down rendering when hero is out of screen
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            Hero3D.setRendering(entry.isIntersecting);
        });
    }, {
        root: null, // viewport
        threshold: 0.05 // start rendering when 5% enters viewport
    });

    observer.observe(heroSection);
}

/* -------------------------------------------------------------
   8.1 HERO DRAWER CLOSE TRIGGER
------------------------------------------------------------- */
function setupHeroScrollTrigger() {
    ScrollTrigger.create({
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
            Hero3D.updateScroll(self.progress);
        }
    });
}

/* -------------------------------------------------------------
   9. MOBILE NAVIGATION DRAWER
------------------------------------------------------------- */
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        const isActive = toggle.classList.toggle('active');
        menu.classList.toggle('active', isActive);
        
        // Pause or restore scrolling when mobile menu open
        if (isActive) {
            if (lenis) lenis.stop();
        } else {
            if (lenis) lenis.start();
        }
    });

    // Close menu when clicking link
    const mobileLinks = document.querySelectorAll('.mobile-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('active');
            menu.classList.remove('active');
            if (lenis) lenis.start();
        });
    });
}

/* -------------------------------------------------------------
   10. TESTIMONIALS AUTO-SCROLLER (MARQUEE WITH HOVER PAUSE)
------------------------------------------------------------- */
function initTestimonialsMarquee() {
    const grid = document.querySelector('.testimonials-grid');
    if (!grid) return;

    const cards = Array.from(grid.children);
    if (cards.length === 0) return;

    // Remove scroll-reveal-item from individual cards to prevent GSAP overrides
    cards.forEach(card => card.classList.remove('scroll-reveal-item'));

    // Wrap in a marquee container
    const parent = grid.parentElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'testimonials-marquee-wrapper scroll-reveal-item';
    parent.replaceChild(wrapper, grid);
    wrapper.appendChild(grid);

    // Clone cards to enable seamless loop
    cards.forEach(card => {
        const clone = card.cloneNode(true);
        grid.appendChild(clone);
    });

    grid.classList.add('marquee-track');

    let scrollWidth = 0;

    function calculateScrollWidth() {
        const gap = parseFloat(getComputedStyle(grid).gap || 40);
        let totalWidth = 0;
        for (let i = 0; i < cards.length; i++) {
            totalWidth += cards[i].offsetWidth;
        }
        scrollWidth = totalWidth + (cards.length * gap);
    }

    setTimeout(() => {
        calculateScrollWidth();
        
        // GSAP seamless loop timeline
        const marqueeTween = gsap.to(grid, {
            x: -scrollWidth,
            duration: 25,
            ease: "none",
            repeat: -1
        });

        // Hover events (Desktop)
        wrapper.addEventListener('mouseenter', () => marqueeTween.pause());
        wrapper.addEventListener('mouseleave', () => marqueeTween.play());

        // Touch events (Mobile/Tablet)
        wrapper.addEventListener('touchstart', () => marqueeTween.pause(), { passive: true });
        wrapper.addEventListener('touchend', () => {
            setTimeout(() => marqueeTween.play(), 800);
        }, { passive: true });

        // Resize support
        window.addEventListener('resize', () => {
            marqueeTween.pause();
            calculateScrollWidth();
            marqueeTween.vars.x = -scrollWidth;
            marqueeTween.invalidate();
            marqueeTween.restart();
            marqueeTween.play();
        });
    }, 150);
}
