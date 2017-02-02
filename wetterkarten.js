/*jslint this:true, white:true for:true */
/*global Image $ */
"use strict";

Date.fromRun = function (hour) {
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


function Panel() {
    this.images = [];
    this.imageDictionary = {};
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

    for (time = timestep.start; time <= timestep.stop; time += timestep.step) {
        if (this.images[runHour][time] === undefined) {
            this.images[runHour][time] = [];
        }
        if (timestep.preload) {
            this.images[runHour][time].push({
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: this.loadImage(timestep.urlGenerator(run, time + timestep.offset))
            });
        }
        else {
            this.images[runHour][time].push({
                urlGenerator: timestep.urlGenerator,
                offset: timestep.offset,
                image: null
            });
        }
    }
};

Panel.prototype.getImage = function (run, time, imageNr) {
    try {
        var runHour = run.getUTCHours();
        if (typeof imageNr !== "number" || isNaN(imageNr)) {
            imageNr = 0;
        }
        var imgElem = this.images[runHour][time][imageNr];
        if (imgElem.image === null) {
            imgElem.image = this.loadImage(imgElem.urlGenerator(run, time + imgElem.offset));
        }
        return imgElem.image;
    }
    catch (err) {
        return null;
    }
};

Panel.prototype.getImageCount = function (run, time) {
    try {
        var runHour = run.getUTCHours();
        return this.images[runHour][time].length;
    }
    catch (err) {
        return 0;
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
            var runParam1 = run.getUTCymd() + "_" + (run < 12 ? "00" : "12")
            var runParam2 = "" + run.getUTCymd() + (run < 12 ? "00" : "12")
            var timeParam = time < 10 ? "00" + time : (time < 100 ? "0" + time : time);
            return "http://www.ogimet.com/forecasts/" + runParam1 + "/" + type + "/" + runParam2 + "H" + timeParam + "_EU00_" + type + ".jpg";
        };        
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
            panelDiv.data("imageNr", 0);

            panelDiv.on("click", function () {
                var panelObj = $(this).data("obj");
                var nextImage = 1 * $(this).data("imageNr") + 1;
                if (nextImage >= panelObj.getImageCount(self.lastRun, self.time)) {
                    nextImage = 0;
                }

                var image = panelObj.getImage(self.lastRun, self.time, nextImage);
                if (image !== null) {
                    $(this).data("imageNr", nextImage);
                    $(this).empty().append(image);
                }
                else {
                    $(this).data("imageNr", 0);
                    image = panelObj.getImage(self.lastRun, self.time, 0);
                    $(this).empty().append(image);
                }
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
            var imageNr = 1 * $(this).data("imageNr");
            var image = panelObj.getImage(self.lastRun, self.time, imageNr);

            if (image !== null) {
                $(this).empty().append(image);
            }
            else {
                $(this).data("imageNr", 0);
                image = panelObj.getImage(self.lastRun, self.time, 0);
                $(this).empty().append(image);
            }
        });
    }
};

Weathermap.panelsToLoad = [
    /* wxcharts MSLP */
    [
        { start: 0, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: 252, step: 12, stop: 384, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: 249, step: 12, stop: 384, offset: 3, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: 246, step: 12, stop: 384, offset: -6, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") },
        { start: 243, step: 12, stop: 384, offset: -3, urlGenerator: Weathermap.getWxcUrlGenerator("mslp") }
    ],
    /* wxcharts 500 hpa geopot height */
    [
        { start: 0, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
        { start: 252, step: 12, stop: 384, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
        { start: 249, step: 12, stop: 384, offset: 3, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
        { start: 246, step: 12, stop: 384, offset: -6, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },
        { start: 243, step: 12, stop: 384, offset: -3, urlGenerator: Weathermap.getWxcUrlGenerator("gh500") },

        { start: 0, step: 3, stop: 240, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
        { start: 252, step: 12, stop: 384, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
        { start: 249, step: 12, stop: 384, offset: 3, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
        { start: 246, step: 12, stop: 384, offset: -6, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") },
        { start: 243, step: 12, stop: 384, offset: -3, urlGenerator: Weathermap.getWxcUrlGenerator("gh500", "polar") }
    ],
    /* wxcharts 850 hpa temp und 6h w3 extremtemp */
    [
        { start: 0, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        { start: 252, step: 12, stop: 384, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        { start: 249, step: 12, stop: 384, offset: 3, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        { start: 246, step: 12, stop: 384, offset: -6, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },
        { start: 243, step: 12, stop: 384, offset: -3, urlGenerator: Weathermap.getWxcUrlGenerator("850temp") },

        { start: 6, step: 6, stop: 78, urlGenerator: Weathermap.getW3UrlGenerator(9, "icon") },
        { start: 3, step: 6, stop: 78, offset: 3, urlGenerator: Weathermap.getW3UrlGenerator(9, "icon") },
        { start: 84, step: 6, stop: 240, urlGenerator: Weathermap.getW3UrlGenerator(9) },
        { start: 81, step: 6, stop: 240, offset: 3, urlGenerator: Weathermap.getW3UrlGenerator(9) }
    ],
    /* wxcharts overview */
    [
        { start: 0, step: 3, stop: 0, offset: 3, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 3, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 252, step: 12, stop: 384, preload: true, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 249, step: 12, stop: 384, offset: 3, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 246, step: 12, stop: 384, offset: -6, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },
        { start: 243, step: 12, stop: 384, offset: -3, urlGenerator: Weathermap.getWxcUrlGenerator("overview") },

        { start: 0, step: 3, stop: 0, offset: 3, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 3, step: 3, stop: 240, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 252, step: 12, stop: 384, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 249, step: 12, stop: 384, offset: 3, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 246, step: 12, stop: 384, offset: -6, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },
        { start: 243, step: 12, stop: 384, offset: -3, urlGenerator: Weathermap.getWxcUrlGenerator("overview", "germany") },

        { start: 12, step: 6, stop: 192, urlGenerator: Weathermap.getOgimetUrlGenerator("SFC") },
        { start: 15, step: 6, stop: 192, offset:3, urlGenerator: Weathermap.getOgimetUrlGenerator("SFC") }
    ],
    /* w3 niederschlag und wolken   */
    [
        { start: 6, step: 6, stop: 78, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(4, "icon") },
        // Die Niderschlagskarten sind 6stündig. Für die Zwischenkarten die 6h Datei aus t+3h laden.
        { start: 3, step: 6, stop: 78, offset: 3, urlGenerator: Weathermap.getW3UrlGenerator(4, "icon") },
        { start: 81, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getW3UrlGenerator(28) },
        { start: 0, step: 3, stop: 78, urlGenerator: Weathermap.getW3UrlGenerator(13, "icon") },
        { start: 81, step: 3, stop: 240, urlGenerator: Weathermap.getW3UrlGenerator(18) }
    ],
    /* wz 850hpa wind und theta e */
    [
        { start: 0, step: 3, stop: 240, preload: true, urlGenerator: Weathermap.getWzUrlGenerator(3) },
        { start: 0, step: 3, stop: 240, urlGenerator: Weathermap.getWzUrlGenerator(7) }

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