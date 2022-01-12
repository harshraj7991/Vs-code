/* globals bz */
function Logger(level) {
    this.level = level || Logger.levels.ERROR;
}

Logger.levels = {
    ERROR: 0,
    WARN: 1,
    TEST: 2,
    INFO: 3
};

Logger.prototype = {
    info: function () {
        if (this.level >= Logger.levels.INFO) {
            console.log.apply(console, arguments);
        }
    },
    warn: function () {
        if (this.level >= Logger.levels.WARN) {
            console.log.apply(console, arguments);
        }
    },
    test: function () {
        if (this.level >= Logger.levels.TEST) {
            console.log.apply(console, arguments);
        }
    },
    error: function () {
        if (this.level >= Logger.levels.ERROR) {
            console.log.apply(console, arguments);
        }
    }
};

var ITEMS_PER_VIEW = 1;
var FEED_JSON_ELEMENT = "RawJSON";
var LEFT_BUTTON_ELEMENT = "leftButton";
var RIGHT_BUTTON_ELEMENT = "rightButton";
var logger = new Logger(Logger.levels.ERRORS); // TODO Revert to ERROR for production & INFO for checking the output


var leftBtn = bz.Creative.getElementByName("leftButton").el;
var rightBtn = bz.Creative.getElementByName("rightButton").el;

leftBtn.addEventListener("click",function(){
    propInview(); // fires on click listen so it takes the previous slide property
    bz.Creative.triggerAnalyticsEvent('leftBtnclk',  bz.Constants.EventType.Interaction, {
        eleid: "leftBtnclk",
        elen: "leftButtonClick" // in view property name
        //elet: "HOTSPOT_V2",
        // evt: "INTERACTION"
    });
});

rightBtn.addEventListener("click",function(){
    propInview(); // fires on click listen so it takes the previous slide property
    bz.Creative.triggerAnalyticsEvent('rightBtnclk',  bz.Constants.EventType.Interaction, {
        eleid: "rightBtnclk",
        elen: "rightButtonClick" // in view property name
        //elet: "HOTSPOT_V2",
        // evt: "INTERACTION"
    });
});


initialize();

function initialize() {
    injectDNSPrefetchLinks([
        "https://cdn.jsdelivr.net/"
    ]);

    injectCSS(["https://cdn.jsdelivr.net/npm/swiper@6.6.2/swiper-bundle.min.css"]);
    
    injectStyles(
        ".swiper-slide {height:200px}" +
        ".swiper-slide-active {border-left: none;}" +
        "[data-lbl='leftButtonIcon'], [data-lbl='rightButtonIcon'] { pointer-events: none; }" +
        "[data-lbl='leftButtonBackground'], [data-lbl='rightButtonBackground'] { cursor: pointer !important; }"
    );

    bz.Common.loadScripts([
        "https://cdn.jsdelivr.net/npm/swiper@6.6.2/swiper-bundle.min.js"
    ]).then(function () {
        initializeCarousel(
            bz.Common.include("Swiper")
        );
    });


    (window.fetch
        ? Promise.resolve(window.fetch)
        : bz.Common.loadScripts([
            "https://cdn.jsdelivr.net/npm/unfetch@4.2.0/dist/unfetch.min.js"
        ]).then(function () {
            return bz.Common.include("unfetch");
        })
    ).then(function (fetch) {
        function checkStatus(response) {
            if (response.ok) {
                console.log(response, "response");
                return response;
            }

            var error = new Error(response.statusText);
            error.response = response;
            return Promise.reject(error);
        }

        var fetchWithErrorHandler = function (endpoint, config) {
            return fetch(endpoint, config).then(checkStatus);
        };
    });
}

function initializeCarousel(Swiper) {
    var page = bz.Creative.getPageByName("Banner Main").el;
    page.style.userSelect = "none";
    page.style.borderWidth = "1px";
    
    

    try {
        var products = JSON.parse(
            bz.Creative.getElementByName(FEED_JSON_ELEMENT).el.innerHTML.replace(
                /\\"/g,
                "\""
            )
        );
    } catch (e) {
        logger.error(
            "initializeCarousel: Failed to get feed JSON from element of name, " +
                FEED_JSON_ELEMENT
        );
        console.error(e);
    }
	
	var productsP = products != null ?
        Promise.resolve(products) : 
        fetch("https://massets.bonzai.co/bespoke/feeds/stuff/stuff-warehouse-nz-fallback.json")
            .then(function (response) { 
                return response.json();
            });

	productsP.then(function (products)  {

    bz.Common.preloadImages(
        products.slice(0, 3).map(function (product) {
            return product.image_link;
        }),
        function () {
            var carouselContainer = bz.Creative.getElementByName("Carousel_Container");

            // Use Carousel_Container element as the container for the carousel or use page.
            (carouselContainer ? carouselContainer.el : page).appendChild(
                createSwiperCarouselDOM(products)
            );


            setupNavigationButtons();

            var swiper = new Swiper(".swiper-container", {
                loop: true,
                autoplay: true,
                slidesPerView: ITEMS_PER_VIEW,
                spaceBetween: 10,
                preloadImages: false,
                navigation: {
                    nextEl: ".bz-button-next",
                    prevEl: ".bz-button-prev"
                }
            });

            document.addEventListener(".item", function () {
                swiper.autoplay.stop();
            });
        }
    );
	});
}

function setupNavigationButtons() {
    var leftButton = bz.Creative.getElementByName(LEFT_BUTTON_ELEMENT);

    if (!leftButton) {
        logger.error(
            "setupNavigationButtons: Could not find element of name " +
                LEFT_BUTTON_ELEMENT
        );
    }

    leftButton.el.classList.add("leftButton");
    leftButton.el.classList.add("bz-button-prev");

    var rightButton = bz.Creative.getElementByName(RIGHT_BUTTON_ELEMENT);

    if (!rightButton) {
        logger.error(
            "setupNavigationButtons: Could not find element of name " +
                RIGHT_BUTTON_ELEMENT
        );
    }

    rightButton.el.classList.add("rightButton");
    rightButton.el.classList.add("bz-button-next");

    leftButton.el.firstElementChild.style.cursor = "pointer";
    rightButton.el.firstElementChild.style.cursor = "pointer";
}

function createSwiperCarouselDOM(properties) {
    var swiperContainer = document.createElement("div");
    swiperContainer.className = "swiper-container";
    swiperContainer.style.left = "0";
    swiperContainer.style.height = "125%";
    swiperContainer.style.width = "100%";
    

    var swiperWrapper = document.createElement("div");
    swiperWrapper.className = "swiper-wrapper";

    properties
        .map(function (item) {
            return createItemDOM(item);
        })
        .forEach(function (dom) {
            swiperWrapper.appendChild(dom);
        });

    swiperContainer.appendChild(swiperWrapper);
    return swiperContainer;
}

/*
Item structure

*/
function createItemDOM(item, url) {
    var itemContainer = document.createElement("div");
    itemContainer.className = "item swiper-slide";
    itemContainer.id = "property-id-" + item.id;
    itemContainer.style.height = "239px";
   

    var style = getStyleString({
        background: "#ffffff",
        padding: "0px",
        "box-sizing": "border-box",
        width: "170px"
    });

    itemContainer.style = style;

    itemContainer.appendChild(
        createProductImageDOM(
            item.image_link,
            item.id,
            item.link,item.price, 
            item.short_title
        )
    );

    var marketImageEl = bz.Creative.getElementByName("MarketPlaceTag");

	if (marketImageEl) {
        var marketImage = marketImage.el;
        var marketUrl = marketImage.firstChild.style.backgroundImage;
        var marketImageDiv = document.createElement("div");
        marketImageDiv.style.height = "36px";
        marketImageDiv.style.width = "100px";
        marketImageDiv.style.backgroundImage = marketUrl;
        marketImageDiv.style.backgroundSize = "contain";
        marketImageDiv.style.backgroundRepeat = "no-repeat";
        marketImageDiv.style.backgroundPosition = "center";
        marketImageDiv.style.position = "absolute";
        marketImageDiv.style.top = 0;
        marketImageDiv.style.left = "-11px";

        itemContainer.appendChild(marketImageDiv);	
    }

    //itemContainer.appendChild(createTitleDOM(item.title));
	
  
  

     var bottomContainer = document.createElement("div");
    bottomContainer.style.margin = "8px 0 0 0";
	bottomContainer.className = "property-image";
    bottomContainer.style.height = "154px";
	bottomContainer.style.backgroundImage = "url(" + url + ")"; 
	bottomContainer.style.backgroundSize = "contain";
	bottomContainer.style.backgroundRepeat = "no-repeat";
	bottomContainer.style.backgroundPosition = "center center";
	bottomContainer.style.cursor = "pointer";


bottomContainer.appendChild(createCTADOM(item.price, item.id));
	
	bottomContainer.addEventListener("click", function () {
        bz.Creative.triggerAnalyticsEvent(
            "click",
            "Click/Tap",
            bz.Constants.EventType.CLICKTHROUGH,
            {
                acts: [
                    {
                        aid: "ic" + item.id,
                        at: "Click Through",
                        a: "openurl",
                        ap: item.link,
                        an: "Open URL"
                    }
                ],
                eleid: "i" + item.id,
                elen: "Image " + item.id,
                elet: "IMAGE"
            }
        );
        bz.Actions.openUrl(item.link);
    });
	


     itemContainer.appendChild(bottomContainer);
     //itemContainer.appendChild(tagContainer);
    return itemContainer;
}

// property inview tracking
function propInview() {

    var currentSlide = document.querySelector(".swiper-slide-active");
   if(currentSlide){
    bz.Creative.triggerAnalyticsEvent('p_view', currentSlide.id, bz.Constants.EventType.Interaction, {
        eleid: "p_view",
        elen: currentSlide.id // in view property name
        //elet: "HOTSPOT_V2",
        // evt: "INTERACTION"
    });
    // console.log(currentSlide.id);
   }


}
setTimeout(function () {
    propInview();
}, 1000);

function createProductImageDOM(url, id, productLink, price, short_title) {
    var style = getStyleString({
        height: "154px",
        "background-image": "url(" + url + ")",
        "background-size": "contain",
        "background-repeat": "no-repeat",
        "background-position": "center center",
        cursor: "pointer"
    });

    var imageContainer = document.createElement("div");
    imageContainer.className = "property-image";
    imageContainer.style = style;



   var hoverContainer =
    document.createElement("div");
    hoverContainer.className = "tooltip";
	hoverContainer.style.position = "relative";
	hoverContainer.style.display = "inline-block";
	hoverContainer.style.visibility = "hidden";
	hoverContainer.style.width = "120px";
	hoverContainer.style.backgroundColor = "#F0F0F0";
	hoverContainer.style.color = "black";
	hoverContainer.style.fontSize = "x-small";
	hoverContainer.style.position = "absolute";
	hoverContainer.style.zIndex = "1";
	hoverContainer.style.top = "38%";
	hoverContainer.style.left = "50%";
	hoverContainer.style.marginLeft = "-60px";
    hoverContainer.style.padding = "2px";
    hoverContainer.style.boxShadow = "5px 5px 4px grey";
	hoverContainer.style.borderRadius = "10px";
    
  
    hoverContainer.appendChild(createPriceDOM(price));
	hoverContainer.appendChild(createTitleDOM(short_title));


	imageContainer.appendChild(hoverContainer);


    imageContainer.addEventListener("click", function () {
        bz.Creative.triggerAnalyticsEvent(
            "click",
            "Click/Tap",
            bz.Constants.EventType.CLICKTHROUGH,
            {
                acts: [
                    {
                        aid: "ic" + id,
                        at: "Click Through",
                        a: "openurl",
                        ap: productLink,
                        an: "Open URL"
                    }
                ],
                eleid: "i" + id,
                elen: "Image " + id,
                elet: "IMAGE"
            }
        );
        // Property click count  
        var currentProductId = this.parentNode.id;
        //console.log(i_ID, "ids");
        
        bz.Creative.triggerAnalyticsEvent('p_click', this.parentNode.id, bz.Constants.EventType.Interaction, {
            eleid: "p_click",
            elen: this.parentNode.id // in view property name
            //elet: "HOTSPOT_V2",
            // evt: "INTERACTION"
        });
        bz.Actions.openUrl(productLink);
    });


    return imageContainer;
}

function createPriceDOM(price) {
      var style = getStyleString({
        "font-weight": "bold",
		"text-align":"center",
		margin: "5px 0px 4px 0px",
          "font-size": "2em"
    });


    var priceContainer = document.createElement("p");
	priceContainer.className = "tooltiptext1";
    priceContainer.innerHTML = "$" + price;
    priceContainer.style = style;

    return priceContainer;
}

function createTitleDOM(short_title,id) {
     var showContainer =
        document.createElement("button");
    showContainer.className = "show";
    showContainer.innerHTML = "SHOP NOW";
    showContainer.style.color = "white";
    showContainer.style.borderStyle = "solid";
    showContainer.style.borderWidth = "1px";
    showContainer.style.background = "#e52625";
    showContainer.style.width = "90px";
    showContainer.style.borderColor = "#e52625";
    showContainer.style.borderRadius = "15px";
    showContainer.style.margin ="5px 17px 0px 17px";
    showContainer.style.padding = "4px 6px 4px 6px";
	showContainer.style.fontWeight = "bold";
    
    var style = getStyleString({
        visibility: "hidden",
        width: "120px",
        "border-size": "100px 80px",
        color: "black",
        "border-radius": "6px",
        "padding-left": "2px",
        "font-size":"1.4em",
        "font-family":"Sans-Serif"
       
    });

    var titleContainer = document.createElement("span");
	titleContainer.className = "tooltiptext";
    titleContainer.innerHTML = short_title;
    titleContainer.style = style;
    titleContainer.title = short_title;
	titleContainer.appendChild(showContainer);
	
    return titleContainer;
}



function createCTADOM(price) {
    
    var style = getStyleString({
        "font-family": "Sans-Serif",
        color: "white",
        outline: "none",
        "font-size":"14pt",
        background: "#e52625", 
        border: "none",
        padding: "5px 0px 5px 10px",
        cursor: "pointer",
        "border-radius":"20px",
        margin: "0px 20px 0px 20px",
        "text-align":"center"
    });
    

    var cta = document.createElement("p");
	cta.className = "tooltiptext";
    cta.innerHTML = "$" + price + " Shop Now";
    cta.style = style;

    return cta;
}




var style1 = document.createElement("style");
	style1.innerText='.property-image:hover .tooltip  {visibility: visible !important;}';
	document.head.appendChild(style1);

	var style4 = document.createElement("style");
	style4.innerText = '.property-image:hover .tooltiptext {visibility: visible !important}';
	document.head.appendChild(style4);




function injectStyles(css) {
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    
    head.appendChild(style);
}

function injectCSS(cssLinks) {
    injectLinksInHead("stylesheet", cssLinks);
}

function injectDNSPrefetchLinks(domains) {
    injectLinksInHead("dns-prefetch", domains);
}

function injectLinksInHead(rel, hrefs) {
    var head = document.getElementsByTagName("head")[0];
    var allLinks = getDOMElementsFragment(
        hrefs.map(function (href) {
            return getLinkDOM(rel, href);
        })
    );

    head.appendChild(allLinks);
}

function getLinkDOM(rel, href) {
    var link = document.createElement("link");
    link.setAttribute("rel", rel);
    link.setAttribute("href", href);

    return link;
}

function getDOMElementsFragment(listOfDOMElements) {
    var fragment = new DocumentFragment();

    listOfDOMElements.forEach(function (dom) {
        fragment.appendChild(dom);
    });

    return fragment;
}

function getStyleString(styleObj) {
    return Object.keys(styleObj)
        .map(function (key) {
            return key + ":" + styleObj[key];
        })
        .join(";");
}
