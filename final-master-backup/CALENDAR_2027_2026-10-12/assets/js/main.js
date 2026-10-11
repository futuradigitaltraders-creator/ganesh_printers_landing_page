/* ===================================================================
    Author          : ModinaTheme
    Version         : 1.0
* ================================================================= */

(function($) {
    "use strict";

    $(document).ready( function() {

    //>> Mobile Menu Js Start <<//
    $('#mobile-menu').meanmenu({
        meanMenuContainer: '.mobile-menu',
        meanScreenWidth: "1199",
        meanExpand: ['<i class="far fa-plus"></i>'],
    });

    //>> Sidebar Toggle Js Start <<//
    $(".offcanvas__close,.offcanvas__overlay").on("click", function() {
        $(".offcanvas__info").removeClass("info-open");
        $(".offcanvas__overlay").removeClass("overlay-open");
    });
    $(".sidebar__toggle").on("click", function() {
        $(".offcanvas__info").addClass("info-open");
        $(".offcanvas__overlay").addClass("overlay-open");
    });

    //>> Body Overlay Js Start <<//
    $(".body-overlay").on("click", function() {
        $(".offcanvas__area").removeClass("offcanvas-opened");
        $(".df-search-area").removeClass("opened");;
        $(".body-overlay").removeClass("opened");
    });

    // Sidebar Area Start <<//
    $(".share-btn").on("click", function() {
        var target = $(this).data("target");
        $("#" + target).toggle();
    });
    $("#openButton").on("click", function(e) {
        e.preventDefault();
        $("#targetElement").removeClass("side_bar_hidden");
    });
    $("#openButton2").on("click", function(e) {
        e.preventDefault();
        $("#targetElement").removeClass("side_bar_hidden");
    });
    $("#closeButton").on("click", function(e) {
        e.preventDefault();
        $("#targetElement").addClass("side_bar_hidden");
    });

    //>> Sticky Header Js Start <<//

    $(window).scroll(function() {
        if ($(this).scrollTop() > 250) {
            $("#header-sticky").addClass("sticky");
        } else {
            $("#header-sticky").removeClass("sticky");
        }
    });

    //>> Smooth Scroll Js <<//
    

    //>> Text Type Start <<//
    $(document).ready(function () {
		const words = ["& customize", "your own!"];
		let index = 0;
		let letterIndex = 0;
		let direction = 1;
		let currentWord = words[0];
		let interval;

		function typeWriter() {
			const word = words[index];
			if (letterIndex < word.length) {
				$("#typing-text").text(
					$("#typing-text").text() + word.charAt(letterIndex)
				);
				letterIndex++;
			} else {
				clearInterval(interval);
				interval = setInterval(eraseText, 150); // Delay between typing and erasing
			}
		}

		function eraseText() {
			if (letterIndex >= 0) {
				const text = currentWord.substring(0, letterIndex);
				$("#typing-text").text(text);
				letterIndex--;
			} else {
				clearInterval(interval);
				index = (index + direction) % words.length;
				if (index < 0) index = words.length - 1;
				currentWord = words[index];
				interval = setInterval(typeWriter, 150); // Delay before typing next word
			}
		}

		interval = setInterval(typeWriter, 150); // Initial delay before typing starts
	});

    //>> Hero Slider Start <<//

    const sliderswiper = new Swiper('.hero-slider', {
        // Optional parameters
        speed: 1500,
        loop: true,
        slidesPerView: 1,
        autoplay: true,
        effect: 'fade',
        breakpoints: {
            '1600': {
                slidesPerView: 1,
            },
            '1400': {
                slidesPerView: 1,
            },
            '1200': {
                slidesPerView: 1,
            },
            '992': {
                slidesPerView: 1,
            },
            '768': {
                slidesPerView: 1,
            },
            '576': {
                slidesPerView: 1,
            },
            '0': {
                slidesPerView: 1,
            },

            a11y: false,
        },
        pagination: {
            el: ".dots",
            clickable: true,
        },

        navigation: {
            prevEl: ".array-next",
            nextEl: ".array-prev",
        },

    });
    
    //>> Video Popup Start <<//
    $(".img-popup").magnificPopup({
        type: "image",
        gallery: {
            enabled: true,
        },
    });

    $('.video-popup').magnificPopup({
        type: 'iframe',
        callbacks: {
        }
    });
    
    //>> Counterup Start <<//
    $(".count").counterUp({
        delay: 15,
        time: 4000,
    });

    //>> Wow Animation Start <<//
    new WOW().init();

    //>> Nice Select Start <<//
    $('select').niceSelect();
    
    //>> Service Slider Start <<//
    if($('.service-slider').length > 0) {
        const serviceSlider = new Swiper(".service-slider", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".dot",
            clickable: true,
        },
        breakpoints: {
            1199: {
                slidesPerView: 4,
            },
            991: {
                slidesPerView: 3,
            },
            767: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    //>> Product Slider Start <<//
    if($('.feature-product-banner-slider').length > 0) {
        const featureProductBannerSlider = new Swiper(".feature-product-banner-slider", {
        spaceBetween: 30,
        speed: 3000,
        loop: true,
        autoplay: {
            delay: 2000,
            disableOnInteraction: false,
        },
        navigation: {
            prevEl: ".array-next",
            nextEl: ".array-prev",
        },
        });
    }

    if($('.product-slider').length > 0) {
        const productSlider = new Swiper(".product-slider", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".dot",
            clickable: true,
        },
        navigation: {
            prevEl: ".array-next",
            nextEl: ".array-prev",
        },
        breakpoints: {
            1199: {
                slidesPerView: 4,
            },
            991: {
                slidesPerView: 3,
            },
            767: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    if($('.popular-product-slider').length > 0) {
        const popularProductSlider = new Swiper(".popular-product-slider", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".dot",
            clickable: true,
        },
        navigation: {
            prevEl: ".array-next",
            nextEl: ".array-prev",
        },
        breakpoints: {
            1199: {
                slidesPerView: 4,
            },
            991: {
                slidesPerView: 3,
            },
            767: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    if($('.catagory-product-slider').length > 0) {
        const catagoryProductSlider = new Swiper(".catagory-product-slider", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        breakpoints: {
            1199: {
                slidesPerView: 5,
            },
            991: {
                slidesPerView: 4,
            },
            767: {
                slidesPerView: 3,
            },
            575: {
                slidesPerView: 2,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    //>> Project Slider Start <<//
    if($('.project-slider').length > 0) {
        const projectSlider = new Swiper(".project-slider", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".project-dot",
        },
        breakpoints: {
            1199: {
                slidesPerView: 3,
            },
            991: {
                slidesPerView: 2,
            },
            767: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    if($('.relative-project-slider').length > 0) {
        const relativeProjectSlider = new Swiper(".relative-project-slider", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".project-dot",
        },
        breakpoints: {
            991: {
                slidesPerView: 2,
            },
            767: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    //>> Testimonial Slider Start <<//
    if($('.testimonial-slider').length > 0) {
        const testimonialSlider = new Swiper(".testimonial-slider", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".dot",
            clickable: true,
        },
        breakpoints: {
            1199: {
                slidesPerView: 4,
            },
            991: {
                slidesPerView: 3,
            },
            767: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    if($('.testimonial-slider-2').length > 0) {
        const testimonialSlider2 = new Swiper(".testimonial-slider-2", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".dot",
            clickable: true,
        },
            
        });
    }

    if($('.testimonial-slider-3').length > 0) {
        const testimonialSlider3 = new Swiper(".testimonial-slider-3", {
        spaceBetween: 30,
        speed: 2000,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".dot",
            clickable: true,
        },
        breakpoints: {
            991: {
                slidesPerView: 2,
            },
            767: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
            
        });
    }

    //>> Brand Slider Start <<//
    const brandSlider = new Swiper(".brand-slider", {
        spaceBetween: 30,
        speed: 1300,
        loop: true,
        centeredSlides: true,
        autoplay: {
            delay: 2000,
            disableOnInteraction: false,
        },

        breakpoints: {
            1199: {
                slidesPerView: 5,
            },
            991: {
                slidesPerView: 4,
            },
            767: {
                slidesPerView: 3,
            },
            575: {
                slidesPerView: 2,
            },
            0: {
                slidesPerView: 1,
            },
        },
    });

    //>> Instagram Slider Start <<//
    const instagramBannerSlider = new Swiper(".instagram-banner-slider", {
        spaceBetween: 0,
        speed: 1500,
        loop: true,
        autoplay: {
            delay: 1000,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: ".array-prev",
            prevEl: ".array-next",
        },
        breakpoints: {
            1199: {
                slidesPerView: 5,
            },
            991: {
                slidesPerView: 4,
            },
            767: {
                slidesPerView: 3,
            },
            650: {
                slidesPerView: 2,
            },
            575: {
                slidesPerView: 1,
            },
            0: {
                slidesPerView: 1,
            },
        },
    });

   
    

    // range sliger
    function getVals() {
        let parent = this.parentNode;
        let slides = parent.getElementsByTagName("input");
        let slide1 = parseFloat(slides[0].value);
        let slide2 = parseFloat(slides[1].value);
        if (slide1 > slide2) {
            let tmp = slide2;
            slide2 = slide1;
            slide1 = tmp;
        }

        let displayElement = parent.getElementsByClassName("rangeValues")[0];
        displayElement.innerHTML = "$" + slide1 + " - $" + slide2;
    }

    window.onload = function() {
        let sliderSections = document.getElementsByClassName("range-slider");
        for (let x = 0; x < sliderSections.length; x++) {
            let sliders = sliderSections[x].getElementsByTagName("input");
            for (let y = 0; y < sliders.length; y++) {
                if (sliders[y].type === "range") {
                    sliders[y].oninput = getVals;
                    sliders[y].oninput();
                }
            }
        }
    }

    progressBar: () => {
        const pline = document.querySelectorAll(".progressbar.line");
        const pcircle = document.querySelectorAll(".progressbar.semi-circle");
        pline.forEach(e => {
            const line = new ProgressBar.Line(e, {
                strokeWidth: 6,
                trailWidth: 6,
                duration: 3000,
                easing: 'easeInOut',
                text: {
                    style: {
                        color: 'inherit',
                        position: 'absolute',
                        right: '0',
                        top: '-30px',
                        padding: 0,
                        margin: 0,
                        transform: null
                    },
                    autoStyleContainer: false
                },
                step: (state, line) => {
                    line.setText(Math.round(line.value() * 100) + ' %');
                }
            });
            let value = e.getAttribute('data-value') / 100;
            new Waypoint({
                element: e,
                handler: function() {
                    line.animate(value);
                },
                offset: 'bottom-in-view',
            })
        });
        pcircle.forEach(e => {
            const circle = new ProgressBar.SemiCircle(e, {
                strokeWidth: 6,
                trailWidth: 6,
                duration: 2000,
                easing: 'easeInOut',
                step: (state, circle) => {
                    circle.setText(Math.round(circle.value() * 100));
                }
            });
            let value = e.getAttribute('data-value') / 100;
            new Waypoint({
                element: e,
                handler: function() {
                    circle.animate(value);
                },
                offset: 'bottom-in-view',
            })
        });
    }

    const rangeInput = document.querySelectorAll(".range-input input"),
    priceInput = document.querySelectorAll(".price-input input"),
    range = document.querySelector(".slider .progress");
    let priceGap = 1000;

    priceInput.forEach((input) => {
        input.addEventListener("input", (e) => {
            let minPrice = parseInt(priceInput[0].value),
                maxPrice = parseInt(priceInput[1].value);

            if (maxPrice - minPrice >= priceGap && maxPrice <= rangeInput[1].max) {
                if (e.target.className === "input-min") {
                    rangeInput[0].value = minPrice;
                    range.style.left = (minPrice / rangeInput[0].max) * 100 + "%";
                } else {
                    rangeInput[1].value = maxPrice;
                    range.style.right = 100 - (maxPrice / rangeInput[1].max) * 100 + "%";
                }
            }
        });
    });

    rangeInput.forEach((input) => {
        input.addEventListener("input", (e) => {
            let minVal = parseInt(rangeInput[0].value),
                maxVal = parseInt(rangeInput[1].value);

            if (maxVal - minVal < priceGap) {
                if (e.target.className === "range-min") {
                    rangeInput[0].value = maxVal - priceGap;
                } else {
                    rangeInput[1].value = minVal + priceGap;
                }
            } else {
                priceInput[0].value = minVal;
                priceInput[1].value = maxVal;
                range.style.left = (minVal / rangeInput[0].max) * 100 + "%";
                range.style.right = 100 - (maxVal / rangeInput[1].max) * 100 + "%";
            }
        });
    });

    //>> Quantity Cart Js Start <<//
    let quantity = 0;
    let price = 0;
    $(".cart-item-quantity-amount, .product-quant").html(quantity);
    $(".total-price, .product-pri").html(price.toFixed(2));
    $(".cart-increment, .cart-incre").on("click", function() {
        if (quantity <= 4) {
            quantity++;
            $(".cart-item-quantity-amount, .product-quant").html(quantity);
            let basePrice = $(".base-price, .base-pri").text();
            $(".total-price, .product-pri").html((basePrice * quantity).toFixed(2));
        }
    });

    $(".cart-decrement, .cart-decre").on("click", function() {
        if (quantity >= 1) {
            quantity--;
            $(".cart-item-quantity-amount, .product-quant").html(quantity);
            let basePrice = $(".base-price, .base-pri").text();
            $(".total-price, .product-pri").html((basePrice * quantity).toFixed(2));
        }
    });

    $(".cart-item-remove>a").on("click", function() {
        $(this).closest(".cart-item").hide(300);
    });

    //>> PaymentMethod Js Start <<//
    const paymentMethod = $("input[name='pay-method']:checked").val();
    $(".payment").html(paymentMethod);
    $(".checkout-radio-single").on("click", function() {
        let paymentMethod = $("input[name='pay-method']:checked").val();
        $(".payment").html(paymentMethod);
    });

    //>> Quantity Js Start <<//
    $(".quantity").on("click", ".plus", function (e) {
        let $input = $(this).prev("input.qty");
        let val = parseInt($input.val(), 10); // Specify base 10
        $input.val(val + 1).change();
    });

    $(".quantity").on("click", ".minus", function (e) {
        let $input = $(this).next("input.qty");
        let val = parseInt($input.val(), 10); // Specify base 10
        if (val > 0) {
            $input.val(val - 1).change();
        }
    });

    //>> Scroll Js Start <<//
    const scrollPath = document.querySelector(".scroll-up path");
    const pathLength = scrollPath.getTotalLength();
    scrollPath.style.transition = scrollPath.style.WebkitTransition = "none";
    scrollPath.style.strokeDasharray = pathLength + " " + pathLength;
    scrollPath.style.strokeDashoffset = pathLength;
    scrollPath.getBoundingClientRect();
    scrollPath.style.transition = scrollPath.style.WebkitTransition = "stroke-dashoffset 10ms linear";

    const updatescroll = function() {
        let scrolltotal = $(window).scrollTop();
        let height = $(document).height() - $(window).height();
        let scrolltotalheight = pathLength - (scrolltotal * pathLength) / height;
        scrollPath.style.strokeDashoffset = scrolltotalheight;
    };
    updatescroll();

    $(window).scroll(updatescroll);
    const offset = 50;
    const duration = 950;

    $(window).on("scroll", function() {
        if (jQuery(this).scrollTop() > offset) {
            jQuery(".scroll-up").addClass("active-scroll");
        } else {
            jQuery(".scroll-up").removeClass("active-scroll");
        }
    });

    $(".scroll-up").on("click", function(event) {
        event.preventDefault();
        jQuery("html, body").animate({
                scrollTop: 0,
            },
            duration
        );
        return false;
    });
     

    //>> Search Popup Start <<//
    const $searchWrap = $(".search-wrap");
    const $navSearch = $(".nav-search");
    const $searchClose = $("#search-close");

    $(".search-trigger").on("click", function (e) {
        e.preventDefault();
        $searchWrap.animate({ opacity: "toggle" }, 500);
        $navSearch.add($searchClose).addClass("open");
    });

    $(".search-close").on("click", function (e) {
        e.preventDefault();
        $searchWrap.animate({ opacity: "toggle" }, 500);
        $navSearch.add($searchClose).removeClass("open");
    });

    function closeSearch() {
        $searchWrap.fadeOut(200);
        $navSearch.add($searchClose).removeClass("open");
    }

    $(document.body).on("click", function (e) {
        closeSearch();
    });

    $(".search-trigger, .main-search-input").on("click", function (e) {
        e.stopPropagation();
    });

    //>> Team Hover Image Show Slider Start <<//
    const projectImageItems = document.querySelectorAll(".project-image-items");

    function followImageCursor(event, projectImageItems) {
        const contentBox = projectImageItems.getBoundingClientRect();
        const dx = event.clientX - contentBox.x;
        const dy = event.clientY - contentBox.y;
        projectImageItems.children[2].style.transform = `translate(${dx}px, ${dy}px) rotate(0)`;
    }
    
    projectImageItems.forEach((item, i) => {
        item.addEventListener("mousemove", (event) => {
            setInterval(followImageCursor(event, item), 1000);
        });
    });

    //>> Split Text Animation <<//
    const st = $(".split-text");
    if (st.length == 0) return;
    gsap.registerPlugin(SplitText);
    st.each(function(index, el) {
        el.split = new SplitText(el, {
            type: "lines,words,chars",
            linesClass: "split-line"
        });
        gsap.set(el, {
            perspective: 400
        });
        if ($(el).hasClass('right')) {
            gsap.set(el.split.chars, {
                opacity: 0,
                x: "50",
                ease: "Back.easeOut",
            });
        }
        if ($(el).hasClass('left')) {
            gsap.set(el.split.chars, {
                opacity: 0,
                x: "-50",
                ease: "circ.out",
            });
        }
        if ($(el).hasClass('up')) {
            gsap.set(el.split.chars, {
                opacity: 0,
                y: "80",
                ease: "circ.out",
            });
        }
        if ($(el).hasClass('down')) {
            gsap.set(el.split.chars, {
                opacity: 0,
                y: "-80",
                ease: "circ.out",
            });
        }
        el.anim = gsap.to(el.split.chars, {
            scrollTrigger: {
                trigger: el,
                start: "top 90%",
            },
            x: "0",
            y: "0",
            rotateX: "0",
            scale: 1,
            opacity: 1,
            duration: 0.4,
            stagger: 0.02,
        });
    });
    

    

    //>> Mouse Cursor Start <<//
    function mousecursor() {
        if ($("body")) {
            const e = document.querySelector(".cursor-inner"),
                t = document.querySelector(".cursor-outer");
            let n,
                i = 0,
                o = !1;
            (window.onmousemove = function(s) {
                o ||
                    (t.style.transform =
                        "translate(" + s.clientX + "px, " + s.clientY + "px)"),
                    (e.style.transform =
                        "translate(" + s.clientX + "px, " + s.clientY + "px)"),
                    (n = s.clientY),
                    (i = s.clientX);
            }),
            $("body").on("mouseenter", "a, .cursor-pointer", function() {
                    e.classList.add("cursor-hover"), t.classList.add("cursor-hover");
                }),
                $("body").on("mouseleave", "a, .cursor-pointer", function() {
                    ($(this).is("a") && $(this).closest(".cursor-pointer").length) ||
                    (e.classList.remove("cursor-hover"),
                        t.classList.remove("cursor-hover"));
                }),
                (e.style.visibility = "visible"),
                (t.style.visibility = "visible");
        }
    }
    $(function() {
        mousecursor();
    });


    }); // End Document Ready Function

    function loader() {
        $(window).on('load', function() {
            // Animate loader off screen
            $(".preloader").addClass('loaded');
            $(".preloader").delay(600).fadeOut();
        });
    }
    loader();
    

})(jQuery); // End jQuery

