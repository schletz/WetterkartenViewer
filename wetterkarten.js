/*jslint this:true, white:true for:true */
/*global Image $ */
"use strict";
Date.fromRunParam = function (runsInterval, delay, testdate) {
    if (!runsInterval) { var runsInterval = 6; }
    if (!delay) { var delay = 0; }

    runsInterval *= 3600000;
    var d = new Date();
    d.setUTCHours(d.getUTCHours() - delay);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    d.setTime(Math.floor(d.getTime() / runsInterval) * runsInterval);
    return d;
};

Date.prototype.getUTCymd = function () {
    var year = this.getUTCFullYear();
    var month = this.getUTCMonth() + 1;
    var day = this.getUTCDate();

    if (month < 10) { month = "0" + month; }
    if (day < 10) { day = "0" + day; }

    return "" + year + month + day;
};

Date.prototype.getUTCymdh = function () {
    var hour = this.getUTCHours();
    hour = hour < 10 ? "0" + hour : "" + hour;

    return this.getUTCymd() + hour;
};


function Panel() {
    this.images = [];
    this.imageDictionary = {};
    this.defaultImage = new Image();
    this.currentImage = null;
    this.currentLayer = 0;
    this.maxLayer = 0;

    this.defaultImage.src = "notAvailable.jpg";
}

Panel.prototype.loadImage = function (url) {
    if (this.imageDictionary[url] !== undefined) {
        return this.imageDictionary[url];
    }

    var img = new Image();
    img.src = url;
    this.imageDictionary[url] = img;
    return img;
};

Panel.prototype.createImages = function (timestep) {
    var time = 0;
    if (!timestep.start) { timestep.start = 0; }
    if (!timestep.step) { timestep.step = 1; }
    if (!timestep.stop) { timestep.stop = 0; }
    if (!timestep.offset) { timestep.offset = 0; }
    if (!timestep.layer) { timestep.layer = 0; }

    if (timestep.layer > this.maxLayer) {
        this.maxLayer = timestep.layer;
    }
    for (time = timestep.start; time <= timestep.stop; time += timestep.step) {
        if (this.images[time] === undefined) {
            this.images[time] = [];
        }
        if (timestep.preload) {
            this.images[time][timestep.layer] = {
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: this.loadImage(timestep.urlGenerator(time + timestep.offset))
            };
        }
        else {
            this.images[time][timestep.layer] = {
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: null
            };
        }
    }
};

Panel.prototype.getImage = function (time, options) {
    try {
        var seek = 0, imgElem = null, t = 0;
        var imgElem = null;
        var t = 0;
        
        if (typeof time !== "number") { var time = 0; }
        if (typeof options.seek === "number") { 
            seek = options.seek;
        }
        if (typeof options.layer === "number") { 
            this.currentLayer = options.layer > this.maxLayer ? 0 : options.layer; 
        }

        for (t = time; t <= time + seek; t += 1) {
            if (this.images[t] !== undefined && this.images[t][this.currentLayer] !== undefined) {
                imgElem = this.images[t][this.currentLayer];
                if (imgElem.image === null) {
                    imgElem.image = this.loadImage(imgElem.urlGenerator(t + imgElem.offset));
                }
                this.currentImage = imgElem.image;
                return this.currentImage;
            }
        }
        this.currentImage = this.defaultImage;
    }
    catch (err) {
        this.currentImage = this.defaultImage;
    }
    return this.currentImage;
};

var Weathermap = {
    container: "#panels",
    minTime: 0,
    maxTime: 384,
    step: 3,
    time: 0,
    getWxcUrlGenerator: function (type, region) {
        if (region === undefined) {
            var region = "euratl";
        }
        var run = Date.fromRunParam(6, 5);
        var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();
        return function (time) {
            var timeParam = time < 10 ? "00" + time : (time < 100 ? "0" + time : time);
            return "http://wxcharts.eu/charts/gfs/" + region + "/" + runParam + "/" + type + "_" + timeParam + ".jpg";
        };
    },
    getWzUrlGenerator: function (type, region) {
        if (region === undefined) {
            var region = "GFSOPME";
        }
        var run = Date.fromRunParam(6, 5);
        var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();

        return function (time) {
            var timeParam = time;
            return "http://www.wetterzentrale.de/maps/" + region + runParam + "_" + timeParam + "_" + type + ".png";
        };
    },
    getW3UrlGenerator: function (type, model) {
        if (model === "ICON" || model === "icon") {
            model = "_ICON";
        }
        else {
            model = "";
        }
        var run = Date.fromRunParam(6, 5);
        var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();

        return function (time) {
            var timeParam = time < 10 ? "0" + time : time;
            return "http://www1.wetter3.de/Animation_" + runParam + "_UTC_025Grad" + model + "/" + timeParam + "_" + type + ".gif";
        };
    },

    getMzUrlGenerator: function (type, model) {
        if (model === undefined) { var model = "WRF4km"; }
        var run = Date.fromRunParam(12, 7);
        var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();

        return function (time) {
            time += 9;
            var timeParam = time < 10 ? "0" + time : time;
            return "http://www.modellzentrale.de/" + model + "/" + runParam + "Z/" + timeParam + "h/" + type + ".png";
        };
    },


    displayPanels: function () {
        var p = null, panelDiv = null, i = 0;
        var self = this;
        $(self.container).empty();
        self.panelsToLoad.forEach(function (panel) {
            p = new Panel();
            panel.forEach(function (panelData) {
                p.createImages(panelData);
            });
            panelDiv = $("<div>").addClass("weatherPanel").attr("id", "panel" + i);
            if (i % 2 === 0) { panelDiv.addClass("col-2"); }
            if (i % 3 === 0) { panelDiv.addClass("col-3"); }
            if (i % 4 === 0) { panelDiv.addClass("col-4"); }
            if (i % 5 === 0) { panelDiv.addClass("col-5"); }

            panelDiv.data("obj", p);
            panelDiv.data("layer", 0);
            panelDiv.on("click", function () { self.onPanelClick(this); });
            panelDiv.on("contextmenu", function () { self.showImageDetails(this); });
            $(self.container).append(panelDiv);
            i += 1;
        });
    },

    showImages: function () {
        var self = this;
        $(".weatherPanel").each(function () {
            var panelObj = $(this).data("obj");
            var image = panelObj.getImage(self.time, { seek: 12 });
            $(this).empty().append(image);
        });
    },

    onPanelClick: function (panel) {
        var panelObj = $(panel).data("obj");
        var image = panelObj.getImage(this.time, { layer: panelObj.currentLayer + 1, seek: 12 });
        $(panel).empty().append(image);
    },

    showImageDetails: function (panel) {
        var panelObj = null, image = null;
        if (panel !== undefined) {
            panelObj = $(panel).data("obj");
            image = panelObj.currentImage;
            var leftPos = 0, topPos = 20, width = 600, height = 400;

            if (image.naturalWidth && image.naturalHeight) {
                leftPos = Math.max(0, ($(window).width() - image.naturalWidth) / 2);
                topPos = Math.max(0, ($(window).height() - image.naturalHeight) / 2);
                width = Math.min($(window).width(), image.naturalWidth);
                height = Math.round(width * image.naturalHeight / image.naturalWidth);
            }
            $("#imageDetails").data("panelObj", panelObj);
            $("#imageDetails").css("left", leftPos + "px");
            $("#imageDetails").css("top", topPos + "px");
            $("#imageDetails").css("width", width + "px");
            $("#imageDetails").css("height", height + "px");
            $("#imageDetails img").css("width", width + "px");
            $("#imageDetails img").css("height", height + "px");
        }
        else {
            if ($("#imageDetails img").length == 0) {
                return;
            }
            panelObj = $("#imageDetails").data("panelObj");
            image = panelObj.currentImage;
        }

        $("#imageDetails img").remove();
        $("#imageDetails").append($(image).clone());
        $("#imageDetails").show();
    }
};

Weathermap.panelsToLoad = [
    /* wxcharts MSLP */
    [
        { start: 0, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: 252, step: 12, stop: 384, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") }
    ],
    /* wxcharts 500 hpa geopot height (europa von wxcharts und wetterzentrale, wxcharts polaransicht) */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },

        { start: 3, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPEU") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(1, "GFSOPEU") },

        { start: 0, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") }
    ],
    /* wxcharts 850 hpa temp, 850 hpa temp anomaly und 6h w3 extremtemp */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },

        { start: 6, step: 6, stop: 78, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(9, "icon") },
        { start: 84, step: 6, stop: 240, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(9) },

        { start: 0, step: 3, stop: 72, layer: 2, urlGenerator: Weathermap.getMzUrlGenerator("T2m_eu3") },

        { start: 0, step: 6, stop: 240, layer: 3, urlGenerator: Weathermap.getWxcUrlGenerator("850temp_anom") },
        { start: 252, step: 12, stop: 384, layer: 3, urlGenerator: Weathermap.getWxcUrlGenerator("850temp_anom") }


    ],
    /* wxcharts overview */
    [
        { start: 3, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },

        { start: 3, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") }
    ],
    /* w3 niederschlag und wolken   */
    [
        // Die Niderschlagskarten sind 6stündig. Für die Zwischenkarten die 6h Datei aus t+3h laden.
        { start: 6, step: 6, stop: 78, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(4, "icon") },
        { start: 81, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(28) },

        { start: 3, step: 3, stop: 78, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(13, "icon") },
        { start: 81, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(18) },
        // WRF 4km Modellzentrale Niederschlag
        { start: 0, step: 3, stop: 72, layer: 2, urlGenerator: Weathermap.getMzUrlGenerator("RR3h_eu") }
    ],
    /* wz 850hpa wind (mitteleuropa und europa) und theta e */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3) },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3) },
        { start: 0, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPEU") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(3, "GFSOPEU") },
        { start: 0, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getWzUrlGenerator(7) },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWzUrlGenerator(7) }

    ]
];

function initUi() {
    $("#timeSlider").on("change", function (event, ui) {
        Weathermap.time = 1 * $("#timeSlider").val();
        Weathermap.showImages();
        Weathermap.showImageDetails();
    });
    Weathermap.time = 0;
    Weathermap.displayPanels("panels");
    Weathermap.showImages();
}

function slideTo(offset) {
    var newTime = Weathermap.time + offset;
    if (newTime < Weathermap.minTime) { newTime = Weathermap.minTime; }
    if (newTime > Weathermap.maxTime) { newTime = Weathermap.maxTime; }
    Weathermap.time = newTime;
    Weathermap.showImages();
    Weathermap.showImageDetails();
    $("#timeSlider").val(newTime);
    $('#timeSlider').slider('refresh');
}

function hideDetailsWindow() {
    $("#imageDetails img").remove();
    $("#imageDetails").hide();
}