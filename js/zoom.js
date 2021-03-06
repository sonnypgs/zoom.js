/*
 * Pure JavaScript-only implementation of zoom.js.
 *
 * Original preamble:
 * zoom.js - It's the best way to zoom an image
 * @version v0.0.2
 * @link https://github.com/fat/zoom.js
 * @license MIT
 *
 * Needs a related CSS file to work. See the README at
 * https://github.com/nishanths/zoom.js for more info.
 *
 * The MIT License. Copyright © 2016 Nishanth Shanmugham.
 */
(() => {
    var zoom = Object.create(null);

    zoom.current = null;
    zoom.OFFSET = 80;
    zoom.initialScrollPos = -1;
    zoom.initialTouchPos = -1;

    var windowWidth = () => document.documentElement.clientWidth;
    var windowHeight = () => document.documentElement.clientHeight;

    var elemOffset = elem => {
        var rect = elem.getBoundingClientRect();
        var docElem = document.documentElement;
        var win = window;
        return {
            top: rect.top + win.pageYOffset - docElem.clientTop,
            left: rect.left + win.pageXOffset - docElem.clientLeft
        };
    };

    var once = (elem, type, handler) => {
        var fn = e => {
            e.target.removeEventListener(type, fn);
            handler();
        };
        elem.addEventListener(type, fn);
    };

    zoom.setup = () => {
        var elems = document.querySelectorAll("img[data-action='zoom']");
        for (var i = 0; i < elems.length; i++) {
            elems[i].addEventListener("click", zoom.prepareZoom);
        }
    };

    zoom.prepareZoom = e => {
        if (document.body.classList.contains("zoom-overlay-open")) {
            return;
        }

        if (e.metaKey || e.ctrlKey) {
            window.open((e.target.getAttribute("data-original") || e.target.src), "_blank");
            return;
        }

        if (e.target.width >= windowWidth() - zoom.OFFSET) {
            return;
        }

        zoom.closeCurrent(true);

        zoom.current = new ZoomImage(e.target);
        zoom.current.zoom();

        zoom.addCloseListeners();
    };

    zoom.closeCurrent = force => {
        if (zoom.current == null) {
            return;
        }
        if (force) {
            zoom.current.dispose();
        } else {
            zoom.current.close();
        }
        zoom.removeCloseListeners();
        zoom.current = null;
    };

    zoom.addCloseListeners = () => {
        document.addEventListener("scroll", zoom.handleScroll);
        document.addEventListener("keyup", zoom.handleKeyup);
        document.addEventListener("touchstart", zoom.handleTouchStart);
        document.addEventListener("click", zoom.handleClick, true);
    };

    zoom.removeCloseListeners = () => {
        document.removeEventListener("scroll", zoom.handleScroll);
        document.removeEventListener("keyup", zoom.handleKeyup);
        document.removeEventListener("touchstart", zoom.handleTouchStart);
        document.removeEventListener("click", zoom.handleClick, true);
    };

    zoom.handleScroll = () => {
        if (zoom.initialScrollPos == -1) {
            zoom.initialScrollPos = window.pageYOffset;
        }

        var deltaY = Math.abs(zoom.initialScrollPos - window.pageYOffset);
        if (deltaY >= 40) {
            zoom.closeCurrent();
        }
    };

    zoom.handleKeyup = e => {
        if (e.keyCode == 27) {
            zoom.closeCurrent();
        }
    };

    zoom.handleTouchStart = e => {
        var t = e.touches[0];
        if (t == null) {
            return;
        }

        initialTouchPos = t.pageY;
        e.target.addEventListener("touchmove", zoom.handleTouchMove);
    };

    zoom.handleTouchMove = e => {
        var t = e.touches[0];
        if (t == null) {
            return;
        }

        if (Math.abs(t.pageY - initialTouchPos) > 10) {
            zoom.closeCurrent();
            e.target.removeEventListener("touchmove", zoom.handleTouchMove);
        }
    };

    zoom.handleClick = () => {
        zoom.closeCurrent();
    };

    class Size {
        constructor(w, h) {
            this.w = w;
            this.h = h;
        }
    }

    class ZoomImage {
        constructor(img) {
            this.img = img;
            this.preservedTransform = img.style.transform;
            this.wrap = null;
            this.overlay = null;
        }

        forceRepaint() {
            var _ = this.img.offsetWidth; 
            return;
        }

        zoom() {
            var size = new Size(this.img.naturalWidth, this.img.naturalHeight);

            this.wrap = document.createElement("div");
            this.wrap.classList.add("zoom-img-wrap");
            this.img.parentNode.insertBefore(this.wrap, this.img);
            this.wrap.appendChild(this.img);

            this.img.classList.add("zoom-img");
            this.img.setAttribute("data-action", "zoom-out");

            this.overlay = document.createElement("div");
            this.overlay.classList.add("zoom-overlay");
            document.body.appendChild(this.overlay);

            this.forceRepaint();
            var scale = this.calculateScale(size);

            this.forceRepaint();
            this.animate(scale);

            document.body.classList.add("zoom-overlay-open");
        }

        calculateScale(size) {
            var maxScaleFactor = size.w / this.img.width;

            var viewportWidth = (windowWidth() - zoom.OFFSET);
            var viewportHeight = (windowHeight() - zoom.OFFSET);
            var imageAspectRatio = size.w / size.h;
            var viewportAspectRatio = viewportWidth / viewportHeight;

            if (size.w < viewportWidth && size.h < viewportHeight) {
                return maxScaleFactor;
            } else if (imageAspectRatio < viewportAspectRatio) {
                return (viewportHeight / size.h) * maxScaleFactor;
            } else {
                return (viewportWidth / size.w) * maxScaleFactor;
            }
        }

        animate(scale) {
            var imageOffset = elemOffset(this.img);
            var scrollTop = window.pageYOffset;

            var viewportX = (windowWidth() / 2);
            var viewportY = scrollTop + (windowHeight() / 2);

            var imageCenterX = imageOffset.left + (this.img.width / 2);
            var imageCenterY = imageOffset.top + (this.img.height / 2);

            var tx = viewportX - imageCenterX;
            var ty = viewportY - imageCenterY;
            var tz = 0;

            var imgTr = `scale(${scale})`;
            var wrapTr = `translate3d(${tx}px, ${ty}px, ${tz}px)`;

            this.img.style.transform = imgTr;
            this.wrap.style.transform = wrapTr;
        }

        dispose() {
            if (this.wrap == null || this.wrap.parentNode == null) {
                return;
            }
            this.img.classList.remove("zoom-img");
            this.img.setAttribute("data-action", "zoom");

            this.wrap.parentNode.insertBefore(this.img, this.wrap);
            this.wrap.parentNode.removeChild(this.wrap);

            document.body.removeChild(this.overlay);
            document.body.classList.remove("zoom-overlay-transitioning");
        }

        close() {
            document.body.classList.add("zoom-overlay-transitioning");
            this.img.style.transform = this.preservedTransform;
            if (this.img.style.length === 0) {
                this.img.removeAttribute("style");
            }
            this.wrap.style.transform = "none";

            once(this.img, "transitionend", () => {
                this.dispose();
                // XXX(nishanths): remove class should happen after dispose. Otherwise,
                // a new click event could fire and create a duplicate ZoomImage for
                // the same <img> element.
                document.body.classList.remove("zoom-overlay-open");
            });
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        zoom.setup();
    });
})();
