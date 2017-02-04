/*jslint this:true, white:true for:true */
/*global Image $ */
"use strict";

Date.fromRun = function (hour) {
    if (typeof hour !== "number" || hour < 0 || hour > 23) { var hour = 0; }

    var d = new Date();
    var now = new Date();
    d.setUTCHours(hour);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);

    if (d.getTime() > now.getTime()) {
        d.setUTCDate(d.getUTCDate() - 1);
    }
    return d;
}

Date.prototype.getUTCymd = function () {
    var year = this.getUTCFullYear();
    var month = this.getUTCMonth() + 1;
    var day = this.getUTCDate();

    if (month < 10) { month = "0" + month; }
    if (day < 10) { day = "0" + day; }

    return "" + year + month + day;
}

Date.prototype.getUTCymdh = function () {
    var hour = this.getUTCHours();
    hour = hour < 10 ? "0" + hour : "" + hour;

    return this.getUTCymd() + hour;
}


function Panel() {
    this.images = [];
    this.imageDictionary = {};
    this.defaultImage = new Image();
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

Panel.prototype.createImages = function (run, timestep) {
    var runHour = run.getUTCHours();
    if (this.images[runHour] === undefined) {
        this.images[runHour] = [];
    }
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
        if (this.images[runHour][time] === undefined) {
            this.images[runHour][time] = [];
        }
        if (timestep.preload) {
            this.images[runHour][time][timestep.layer] = {
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: this.loadImage(timestep.urlGenerator(run, time + timestep.offset))
            };
        }
        else {
            this.images[runHour][time][timestep.layer] = {
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: null
            };
        }
    }
};

Panel.prototype.getImage = function (run, time, layer, seek) {
    try {
        if (typeof run !== "object") { var run = Date.fromRun(0); }
        if (typeof time !== "number") { var time = 0; }
        if (typeof layer !== "number") { var layer = 0; }
        if (typeof seek !== "number") { var seek = 0; }

        var runHour = run.getUTCHours();
        var imgElem = null;
        var t = 0;

        for (t = time; t <= time + seek; t++) {
            if (this.images[runHour][t] !== undefined && this.images[runHour][t][layer] !== undefined) {
                imgElem = this.images[runHour][t][layer];
                if (imgElem.image === null) {
                    imgElem.image = this.loadImage(imgElem.urlGenerator(run, t + imgElem.offset));
                }
                return imgElem.image;
            }
        }
        return this.defaultImage;
    }
    catch (err) {
        return this.defaultImage;
    }
};

var Weathermap = {
    container: "#panels",
    panels: [],
    minTime: 0,
    maxTime: 384,
    step: 3,
    time: 0,
    lastRun: null,
    getWxcUrlGenerator: function (type, region) {
        if (region === undefined) {
            var region = "euratl";
        }
        return function (run, time) {
            var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();
            var timeParam = time < 10 ? "00" + time : (time < 100 ? "0" + time : time);
            return "http://wxcharts.eu/charts/gfs/" + region + "/" + runParam + "/" + type + "_" + timeParam + ".jpg";
        };
    },
    getWzUrlGenerator: function (type) {
        return function (run, time) {
            var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();
            var timeParam = time;
            return "http://www.wetterzentrale.de/maps/GFSOPME" + runParam + "_" + timeParam + "_" + type + ".png";
        };
    },
    getW3UrlGenerator: function (type, model) {
        if (model === "ICON" || model === "icon") {
            model = "_ICON";
        }
        else {
            model = "";
        }
        return function (run, time) {
            var runParam = run.getUTCHours() < 10 ? "0" + run.getUTCHours() : run.getUTCHours();
            var timeParam = time < 10 ? "0" + time : time;
            return "http://www1.wetter3.de/Animation_" + runParam + "_UTC_025Grad" + model + "/" + timeParam + "_" + type + ".gif";
        };
    },
    getOgimetUrlGenerator: function (type) {
        return function (run, time) {
            if (type === undefined) {
                var type = "SFC";
            }
            var ogimetRun = new Date(run);
            if (run.getUTCHours() < 12) {
                ogimetRun.setUTCHours(0);
                time += run.getUTCHours();
            }
            else {
                ogimetRun.setUTCHours(12);
                time += run.getUTCHours() + 12;
            }
            run.getUTCHours() < 12
            var runParam1 = ogimetRun.getUTCymd() + "_" + (ogimetRun.getUTCHours() < 12 ? "00" : "12")
            var runParam2 = "" + ogimetRun.getUTCymd() + (ogimetRun.getUTCHours() < 12 ? "00" : "12")
            var timeParam = time < 10 ? "00" + time : (time < 100 ? "0" + time : time);
            return "http://www.ogimet.com/forecasts/" + runParam1 + "/" + type + "/" + runParam2 + "H" + timeParam + "_EU00_" + type + ".jpg";
        };
    },

    getMeteocielUrlGenerator: function (type) {
        return function (run, time) {
            if (type === undefined) { var type = 0; }
            var runParam = run.getUTCymdh();
            var timeParam = time;
            var append = (time % 6 != 0) ? "-3h" : "";

            return "http://modeles.meteociel.fr/modeles/gfs/run/gfs-" + type + "-" + timeParam + append + ".png";
        }

    },

    displayPanels: function () {
        var p = null, panelDiv = null, i = 0;
        var self = this;
        $(self.container).empty();
        self.panelsToLoad.forEach(function (panel) {
            p = new Panel();
            panel.forEach(function (panelData) {
                p.createImages(self.lastRun, panelData);
            });
            panelDiv = $("<div>").addClass("weatherPanel").attr("id", "panel" + i);
            if (i % 2 === 0) { panelDiv.addClass("col-2"); }
            if (i % 3 === 0) { panelDiv.addClass("col-3"); }
            if (i % 4 === 0) { panelDiv.addClass("col-4"); }
            if (i % 5 === 0) { panelDiv.addClass("col-5"); }

            panelDiv.data("obj", p);
            panelDiv.data("layer", 0);

            panelDiv.on("click", function () {
                var panelObj = $(this).data("obj");
                var layer = 1 * $(this).data("layer") + 1;

                if (layer > panelObj.maxLayer) {
                    layer = 0;
                }

                var image = panelObj.getImage(self.lastRun, self.time, layer, 12);
                $(this).data("layer", layer);
                $(this).empty().append(image);
            });

            panelDiv.on("contextmenu", function () {
                var image = new Image();
                image.src = $(this).find("img").first().attr("src");
                $("#imageDetails").empty().append(image);
                $("#imageDetails").dialog({ width: image.width + 50, height: image.height + 70 });
            });

            $(self.container).append(panelDiv);
            i += 1;
        });
    },

    showImages: function () {
        var self = this;
        $(".weatherPanel").each(function () {
            var panelObj = $(this).data("obj");
            var layer = 1 * $(this).data("layer");
            var image = panelObj.getImage(self.lastRun, self.time, layer, 12);

            $(this).empty().append(image);
        });
    }
};

Weathermap.panelsToLoad = [
    /* wxcharts MSLP */
    [
        { start: 0, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: 252, step: 12, stop: 384, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
    ],
    /* wxcharts 500 hpa geopot height */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },

        { start: 0, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getMeteocielUrlGenerator(0) },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getMeteocielUrlGenerator(0) },

        { start: 0, step: 3, stop: 240, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") }
    ],
    /* wxcharts 850 hpa temp, 850 hpa temp anomaly und 6h w3 extremtemp */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },

        { start: 6, step: 6, stop: 78, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(9, "icon") },
        { start: 84, step: 6, stop: 240, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(9) },

        { start: 0, step: 6, stop: 240, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("850temp_anom") },
        { start: 252, step: 12, stop: 384, layer: 2, urlGenerator: Weathermap.getWxcUrlGenerator("850temp_anom") }


    ],
    /* wxcharts overview */
    [
        { start: 3, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 252, step: 12, stop: 384, layer: 0, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },

        { start: 3, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 252, step: 12, stop: 384, layer: 1, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },

        { start: 0, step: 6, stop: 192, layer: 2, urlGenerator: Weathermap.getOgimetUrlGenerator("SFC") },
    ],
    /* w3 niederschlag und wolken   */
    [
        // Die Niderschlagskarten sind 6stündig. Für die Zwischenkarten die 6h Datei aus t+3h laden.
        { start: 6, step: 6, stop: 78, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(4, "icon") },
        { start: 81, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(28) },
        { start: 3, step: 3, stop: 78, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(13, "icon") },
        { start: 81, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getW3UrlGenerator(18) }
    ],
    /* wz 850hpa wind und theta e */
    [
        { start: 0, step: 3, stop: 240, layer: 0, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3) },
        { start: 0, step: 3, stop: 240, layer: 1, urlGenerator: Weathermap.getWzUrlGenerator(7) }

    ]
];

function initUi(lastRun) {
    $("#modelChooseWindow").hide();
    $("#slidebar").show();
    var onSlide = function (event, ui) {
        Weathermap.time = ui.value;
        Weathermap.showImages();
    };
    $("#slider").slider({
        min: Weathermap.minTime, max: Weathermap.maxTime, step: Weathermap.step,
        slide: onSlide,
        change: onSlide
    });
    Weathermap.lastRun = lastRun;
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
    $("#slider").slider("value", newTime);
}